exports.generateDoctorSlots = (
  shiftStart,
  shiftEnd,
  doctorIdString = "DOC-001",
) => {
  const slotsMatrix = [];

  const [startH, startM] = (shiftStart || "09:00").split(":").map(Number);
  const [endH, endM] = (shiftEnd || "17:00").split(":").map(Number);

  let currentTracker = new Date(2026, 0, 1, startH, startM, 0, 0);
  const endBoundary = new Date(2026, 0, 1, endH, endM, 0, 0);

  let numericalId = 1;
  if (typeof doctorIdString === "string") {
    const extractedDigits = doctorIdString.match(/\d+/);
    if (extractedDigits) {
      numericalId = parseInt(extractedDigits[0], 10);
    } else {
      numericalId = doctorIdString.charCodeAt(doctorIdString.length - 1);
    }
  }

  const isEvenDoctor = numericalId % 2 === 0;
  let continuousConsultationsCounter = 0;

  while (currentTracker < endBoundary) {
    const currentHour = currentTracker.getHours();
    const currentMinute = currentTracker.getMinutes();
    const absoluteMinutes = currentHour * 60 + currentMinute;

    /* Logic: Alternating Lunch Boundaries */
    let insideLunchBreakWindow = false;
    if (isEvenDoctor) {
      if (absoluteMinutes >= 750 && absoluteMinutes < 810) {
        insideLunchBreakWindow = true;
      }
    } else {
      if (absoluteMinutes >= 810 && absoluteMinutes < 870) {
        insideLunchBreakWindow = true;
      }
    }

    /* Logic: Compute Selectable Roster Slots */
    if (!insideLunchBreakWindow) {
      let timeString = currentTracker.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      timeString = timeString.replace(/^0/, "").replace(/\s+/g, " ");
      slotsMatrix.push(timeString);
      continuousConsultationsCounter++;

      /* Logic: 15-Minute Breather Window after 2 Consecutive Blocks */
      if (continuousConsultationsCounter === 2) {
        continuousConsultationsCounter = 0;
        currentTracker.setMinutes(currentTracker.getMinutes() + 45);
        continue;
      }
    } else {
      continuousConsultationsCounter = 0;
    }

    currentTracker.setMinutes(currentTracker.getMinutes() + 30);
  }

  return slotsMatrix;
};
