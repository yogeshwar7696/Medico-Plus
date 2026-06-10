const patienceData = {
  "patients": [
    {
      "patientId": "PAT000000001",
      "name": "Rahul Sharma",
      "age": 29,
      "email": "rahul.s@example.com",
      "phoneNumber": "9876901234",
      "emergencyNumber": "9123345678",
      "gender": "Male",
      "address": "12 Sunrise St, Chennai",
      "appointmentData": [
        {
          "date": "2025-12-15",
          "time": "10:00 AM",
          "doctorName": "Dr. Suresh Menon",
          "specialization": "General Physician",
          "prescription": [
            { "id": "M001", "name": "Paracetamol", "dosage": "500mg twice daily" }
          ],
          "tests": [
            { "id": "T001", "name": "Blood Test", "result": "Normal" }
          ],
          "remarks": "Patient recovering well",
          "status": "Past"
        },
        {
          "date": "2026-03-23",
          "time": "09:00 AM",
          "doctorName": "Dr. Suresh Menon",
          "specialization": "General Physician",
          "reasonForVisit": "Routine Checkup",
          "status": "Upcoming"
        }
      ]
    },
    {
      "patientId": "PAT000000002",
      "name": "Anita Verma",
      "age": 34,
      "email": "anita.v@example.com",
      "phoneNumber": "9876504321",
      "emergencyNumber": "9123341111",
      "gender": "Female",
      "address": "45 Green Park, Delhi",
      "appointmentData": [
        {
          "date": "2026-01-10",
          "time": "11:30 AM",
          "doctorName": "Dr. Kavita Rao",
          "specialization": "Dermatologist",
          "prescription": [
            { "id": "M007", "name": "Cetirizine", "dosage": "10mg once daily" }
          ],
          "tests": [
            { "id": "T005", "name": "Urine Test", "result": "Mild reaction" }
          ],
          "remarks": "Advised to avoid allergens",
          "status": "Past"
        },
        {
          "date": "2026-04-05",
          "time": "02:00 PM",
          "doctorName": "Dr. Kavita Rao",
          "specialization": "Dermatologist",
          "reasonForVisit": "Follow-up",
          "status": "Upcoming"
        }
      ]
    },
    {
      "patientId": "PAT000000003",
      "name": "Vikram Singh",
      "age": 42,
      "email": "vikram.s@example.com",
      "phoneNumber": "9876123456",
      "emergencyNumber": "9123342222",
      "gender": "Male",
      "address": "78 MG Road, Bangalore",
      "appointmentData": [
        {
          "date": "2026-02-20",
          "time": "09:45 AM",
          "doctorName": "Dr. Arjun Patel",
          "specialization": "Cardiologist",
          "prescription": [
            { "id": "M010", "name": "Aspirin", "dosage": "75mg once daily" },
            { "id": "M005", "name": "Metformin", "dosage": "500mg once daily" }
          ],
          "tests": [
            { "id": "T006", "name": "ECG", "result": "Normal" },
            { "id": "T009", "name": "Kidney Function Test", "result": "Borderline high" }
          ],
          "remarks": "Lifestyle changes recommended",
          "status": "Past"
        },
        {
          "date": "2026-04-15",
          "time": "10:30 AM",
          "doctorName": "Dr. Arjun Patel",
          "specialization": "Cardiologist",
          "reasonForVisit": "Routine follow-up",
          "status": "Upcoming"
        }
      ]
    },
    {
      "patientId": "PAT000000004",
      "name": "Priya Nair",
      "age": 27,
      "email": "priya.n@example.com",
      "phoneNumber": "9876009876",
      "emergencyNumber": "9123343333",
      "gender": "Female",
      "address": "22 Lotus Lane, Kochi",
      "appointmentData": [
        {
          "date": "2026-01-05",
          "time": "03:00 PM",
          "doctorName": "Dr. Meera Iyer",
          "specialization": "Gynecologist",
          "prescription": [
            { "id": "M015", "name": "Iron Supplement", "dosage": "once daily" }
          ],
          "tests": [
            { "id": "T008", "name": "Liver Function Test", "result": "Normal" }
          ],
          "remarks": "Routine prenatal check",
          "status": "Past"
        }
      ]
    },
    {
      "patientId": "PAT000000005",
      "name": "Arjun Reddy",
      "age": 31,
      "email": "arjun.r@example.com",
      "phoneNumber": "9876012345",
      "emergencyNumber": "9123344444",
      "gender": "Male",
      "address": "56 Hill View, Hyderabad",
      "appointmentData": [
        {
          "date": "2026-02-12",
          "time": "01:00 PM",
          "doctorName": "Dr. Naveen Kumar",
          "specialization": "Orthopedic",
          "prescription": [
            { "id": "M004", "name": "Ibuprofen", "dosage": "400mg twice daily" }
          ],
          "tests": [
            { "id": "T002", "name": "X-Ray", "result": "Minor fracture" }
          ],
          "remarks": "Advised rest and physiotherapy",
          "status": "Past"
        }
      ]
    },
    {
      "patientId": "PAT000000006",
      "name": "Sneha Kapoor",
      "age": 25,
      "email": "sneha.k@example.com",
      "phoneNumber": "9876023456",
      "emergencyNumber": "9123345555",
      "gender": "Female",
      "address": "14 Rose Ave, Pune",
      "appointmentData": [
        {
          "date": "2026-03-01",
          "time": "04:00 PM",
          "doctorName": "Dr. Ramesh Gupta",
          "specialization": "Neurologist",
          "prescription": [
            { "id": "M014", "name": "Prednisolone", "dosage": "10mg once daily" }
          ],
          "tests": [
            { "id": "T003", "name": "MRI Scan", "result": "Normal" }
          ],
          "remarks": "Headache evaluation",
          "status": "Past"
        }
      ]
    },
    {
      "patientId": "PAT000000007",
      "name": "Karan Malhotra",
      "age": 38,
      "email": "karan.m@example.com",
      "phoneNumber": "9876034567",
      "emergencyNumber": "9123346666",
      "gender": "Male",
      "address": "88 Lake View, Mumbai",
      "appointmentData": [
        {
          "date": "2026-02-28",
          "time": "12:00 PM",
          "doctorName": "Dr. Shalini Desai",
          "specialization": "Endocrinologist",
          "prescription": [
            { "id": "M009", "name": "Insulin", "dosage": "Injection daily" }
          ],
          "tests": [
            { "id": "T010", "name": "Thyroid Profile", "result": "TSH elevated" }
          ],
          "remarks": "Diabetes management",
          "status": "Past"
        }
      ]
    }
    // Continue similarly for patients PAT000000008 through PAT000000020
  ]
};

export default patienceData;