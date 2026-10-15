// Plantilla del sistema educativo colombiano: Transición, Primaria (1° a 5°)
// y Bachillerato (6° a 11°).
const STANDARD_GRADE_LEVELS = [
  { name: 'Transición', shortName: 'T', sequenceOrder: 0 },
  { name: 'Primero', shortName: '1°', sequenceOrder: 1 },
  { name: 'Segundo', shortName: '2°', sequenceOrder: 2 },
  { name: 'Tercero', shortName: '3°', sequenceOrder: 3 },
  { name: 'Cuarto', shortName: '4°', sequenceOrder: 4 },
  { name: 'Quinto', shortName: '5°', sequenceOrder: 5 },
  { name: 'Sexto', shortName: '6°', sequenceOrder: 6 },
  { name: 'Séptimo', shortName: '7°', sequenceOrder: 7 },
  { name: 'Octavo', shortName: '8°', sequenceOrder: 8 },
  { name: 'Noveno', shortName: '9°', sequenceOrder: 9 },
  { name: 'Décimo', shortName: '10°', sequenceOrder: 10 },
  { name: 'Once', shortName: '11°', sequenceOrder: 11, isFinalGrade: true },
];

export default STANDARD_GRADE_LEVELS;
