const availableMedicines = [
  {
    "id": "M001",
    "name": "Paracetamol",
    "category": "Analgesic",
    "details": "Relieves fever and mild pain.",
    "price": 50,
    "prescription_required": false,
    "dosage": "500mg every 4-6 hours",
    "sideEffects": "Nausea, skin rash (rare)",
    "when_to_take": { "morning": true, "evening": true, "after_meals": true }
  },
  {
    "id": "M002",
    "name": "Amoxicillin",
    "category": "Antibiotic",
    "details": "Treats bacterial infections effectively.",
    "price": 200,
    "prescription_required": true,
    "dosage": "500mg three times daily",
    "sideEffects": "Diarrhea, vomiting, rash",
    "when_to_take": { "morning": true, "evening": true, "after_meals": true }
  },
  {
    "id": "M003",
    "name": "Vitamin D Supplement",
    "category": "Supplement",
    "details": "Supports bone strength and immunity.",
    "price": 150,
    "prescription_required": false,
    "dosage": "1000 IU once daily",
    "sideEffects": "None common at standard doses",
    "when_to_take": { "morning": true, "with_breakfast": true }
  },
  {
    "id": "M004",
    "name": "Ibuprofen",
    "category": "NSAID",
    "details": "Reduces pain, fever, and inflammation.",
    "price": 120,
    "prescription_required": false,
    "dosage": "400mg every 6-8 hours",
    "sideEffects": "Stomach upset, heartburn",
    "when_to_take": { "afternoon": true, "evening": true, "after_meals": true }
  },
  {
    "id": "M005",
    "name": "Metformin",
    "category": "Antidiabetic",
    "details": "Controls blood sugar in type 2 diabetes.",
    "price": 250,
    "prescription_required": true,
    "dosage": "500mg twice daily",
    "sideEffects": "Nausea, metallic taste",
    "when_to_take": { "morning": true, "evening": true, "after_meals": true }
  },
  {
    "id": "M006",
    "name": "Omeprazole",
    "category": "Antacid",
    "details": "Reduces stomach acid and reflux.",
    "price": 180,
    "prescription_required": true,
    "dosage": "20mg daily before food",
    "sideEffects": "Headache, stomach pain",
    "when_to_take": { "morning": true, "before_breakfast": true }
  },
  {
    "id": "M007",
    "name": "Cetirizine",
    "category": "Antihistamine",
    "details": "Relieves allergy symptoms and itching.",
    "price": 90,
    "prescription_required": false,
    "dosage": "10mg once daily",
    "sideEffects": "Drowsiness, dry mouth",
    "when_to_take": { "evening": true, "before_bed": true }
  },
  {
    "id": "M008",
    "name": "Azithromycin",
    "category": "Antibiotic",
    "details": "Treats respiratory and skin infections.",
    "price": 300,
    "prescription_required": true,
    "dosage": "500mg once daily for 3 days",
    "sideEffects": "Loose stools, nausea",
    "when_to_take": { "afternoon": true, "after_meals": true }
  },
  {
    "id": "M009",
    "name": "Insulin",
    "category": "Hormone",
    "details": "Regulates blood sugar in diabetes.",
    "price": 600,
    "prescription_required": true,
    "dosage": "As directed by physician",
    "sideEffects": "Hypoglycemia, injection site reaction",
    "when_to_take": { "before_meals": true }
  },
  {
    "id": "M010",
    "name": "Aspirin",
    "category": "Antiplatelet",
    "details": "Prevents blood clots and protects heart.",
    "price": 70,
    "prescription_required": true,
    "dosage": "75mg-150mg once daily",
    "sideEffects": "Increased bleeding risk",
    "when_to_take": { "morning": true, "after_meals": true }
  },
  {
    "id": "M011",
    "name": "Multivitamin",
    "category": "Supplement",
    "details": "Boosts energy, immunity, and wellness.",
    "price": 200,
    "prescription_required": false,
    "dosage": "1 tablet daily",
    "sideEffects": "Urine discoloration",
    "when_to_take": { "morning": true, "with_food": true }
  },
  {
    "id": "M012",
    "name": "Hydroxychloroquine",
    "category": "Antimalarial",
    "details": "Prevents malaria and treats autoimmune issues.",
    "price": 400,
    "prescription_required": true,
    "dosage": "200mg-400mg daily",
    "sideEffects": "Vision changes, dizziness",
    "when_to_take": { "morning": true, "evening": true, "after_meals": true }
  }
];

export default availableMedicines;