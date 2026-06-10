const Order = require("../models/Order_Model");
const Medicine = require("../models/Medicine_Model");
const Test = require("../models/Test_Model");
const { createNotification } = require("../utils/notificationService");

exports.createOrder = async (req, res) => {
  try {
    const { items, patientId, patientName, paymentStatus, status } = req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Cannot process an empty checkout matrix." });
    }

    let calculatedTotal = 0;
    const medicinesToUpdate = [];

    for (const item of items) {
      if (item.type === "Medicine") {
        const med = await Medicine.findById(item.itemId);

        if (!med) {
          return res.status(404).json({
            message: `Medicine item [${item.name}] not found in clinical database.`,
          });
        }

        if (med.stock < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${item.name}. Available: ${med.stock}, Requested: ${item.quantity}`,
          });
        }

        medicinesToUpdate.push({ doc: med, quantity: item.quantity });
        calculatedTotal += med.price * item.quantity;
      } else if (item.type === "Test") {
        const labTest = await Test.findById(item.itemId);
        if (!labTest) {
          return res.status(404).json({
            message: `Diagnostic procedure [${item.name}] not found.`,
          });
        }
        calculatedTotal += labTest.price * item.quantity;
      }
    }

    for (const record of medicinesToUpdate) {
      record.doc.stock -= record.quantity;
      await record.doc.save();

      if (record.doc.stock < 10) {
        createNotification({
          userRole: "Admin",
          message: `Stock Warning: "${record.doc.name}" inventory is critically low (${record.doc.stock} left).`,
          type: "warning",
        }).catch((e) =>
          console.error("Low stock notification failed:", e.message),
        );
      }
    }

    const newOrder = new Order({
      patientId,
      patientName,
      items,
      totalAmount: calculatedTotal,
      status: status || "Pending",
      paymentStatus: paymentStatus || "Unpaid",
    });

    const savedOrder = await newOrder.save();

    createNotification({
      userRole: "Admin",
      message: `New Order: ${savedOrder.patientName} placed order #${savedOrder.orderID} totaling ₹${savedOrder.totalAmount}.`,
      type: "system",
    }).catch((e) =>
      console.error("Admin order notification failed:", e.message),
    );

    res.status(201).json({
      message: "Order placed successfully",
      orderID: savedOrder.orderID,
      data: savedOrder,
    });
  } catch (err) {
    res.status(500).json({ message: "Checkout failed", error: err.message });
  }
};

exports.getPatientOrders = async (req, res) => {
  try {
    const orders = await Order.find({ patientId: req.params.patientId }).sort({
      createdAt: -1,
    });
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMedicineProcurementHistory = async (req, res) => {
  try {
    const historyLogs = await Order.find({ "items.type": "Medicine" }).sort({
      createdAt: -1,
    });
    const flatMedHistory = [];

    historyLogs.forEach((order) => {
      order.items.forEach((item) => {
        if (item.type === "Medicine") {
          flatMedHistory.push({
            _id: `${order._id}_${item._id}`,
            orderId: order.orderID,
            date: new Date(order.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "2-digit",
              year: "numeric",
            }),
            orderedBy: order.patientName,
            staffId: "PATIENT-PORTAL",
            resourceName: item.name,
            quantity: item.quantity,
            status: order.status,
            totalAmount: item.price * item.quantity,
            isVaultOrder: true,
          });
        }
      });
    });

    return res.status(200).json(flatMedHistory);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Medicine log aggregation failed", error: err.message });
  }
};

exports.getTestProcurementHistory = async (req, res) => {
  try {
    const historyLogs = await Order.find({ "items.type": "Test" }).sort({
      createdAt: -1,
    });
    const flatTestHistory = [];

    historyLogs.forEach((order) => {
      order.items.forEach((item) => {
        if (item.type === "Test") {
          flatTestHistory.push({
            _id: `${order._id}_${item._id}`,
            orderId: order.orderID,
            date: new Date(order.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "2-digit",
              year: "numeric",
            }),
            orderedBy: order.patientName,
            staffId: "PATIENT-PORTAL",
            resourceName: item.name,
            quantity: item.quantity,
            status: order.status,
            totalAmount: item.price * item.quantity,
            isVaultOrder: true,
          });
        }
      });
    });

    return res.status(200).json(flatTestHistory);
  } catch (err) {
    return res.status(500).json({
      message: "Diagnostics log aggregation failed",
      error: err.message,
    });
  }
};

const Orders = require("../models/Order_Model");

// ADMINISTRATIVE CONTROL: FETCH GLOBAL DISPATCH REGISTRY
exports.getAllOrders = async (req, res) => {
  try {
    const masterLedger = await Orders.find()
      .populate({
        path: "patientId",
        select: "name email contact age gender photo",
        model: "Patients",
      })
      .sort({ createdAt: -1 });

    res.status(200).json(masterLedger);
  } catch (err) {
    console.error("Master Procurement Fetch Failure:", err.message);
    res.status(500).json({
      message: "Internal Audit Interruption Error: " + err.message,
    });
  }
};

// ADMINISTRATIVE CONTROL: FETCH SINGLE GRANULAR RECORD INVOICE FILE
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const orderRecord = await Order.findOne({
      $or: [
        {
          _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null,
        },
        { orderID: id },
      ],
    }).populate({
      path: "patientId",
      select: "name email contact age gender photo bloodGroup height weight",
      model: "Patients",
    });

    if (!orderRecord) {
      return res.status(404).json({
        message:
          "Target procurement invoice record or token not found inside database registries.",
      });
    }

    res.status(200).json(orderRecord);
  } catch (err) {
    console.error("Granular Document Extraction Crash Log:", err.message);
    res.status(500).json({
      message: "Internal record processing loop exception: " + err.message,
    });
  }
};
