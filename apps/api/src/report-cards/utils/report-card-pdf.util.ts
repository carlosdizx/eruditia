import PDFDocument from 'pdfkit';
import { roundScore } from '@common/utils/score.util';
import type { AnnualScore } from '../../gradebooks/utils/annual-score.util';
import { weightedAverage } from '../../gradebooks/utils/annual-results.util';

type Person = { firstName: string; lastName: string };
type Position = { position: number; total: number } | null;

// Lo que necesita el PDF de cada boletín (subconjunto de buildReportCard).
export interface PrintableReportCard {
  organization: { name: string };
  student: Person & {
    documentType: string;
    documentNumber: string;
    studentCode: string;
  };
  reportCard: {
    academicYear: { name: string };
    classroom: {
      name: string;
      gradeLevel: { name: string } | null;
      homeroomTeacher: Person | null;
    };
    scale: {
      maxScore: number;
      passingScore: number;
      decimalPlaces: number;
      showRankInReportCard: boolean;
    };
    periods: {
      id: string;
      name: string;
      orderIndex: number;
      weightPercentage: number;
    }[];
    subjects: {
      weightInGpa: number;
      weeklyHours: number | null;
      subject: { name: string };
      teacher: Person | null;
      periods: Record<
        string,
        {
          score: number | null;
          observation: string | null;
          concept: string | null;
        }
      >;
      annual: AnnualScore;
      recovery: { score: number; originalScore: number | null } | null;
      finalConcept: string | null;
    }[];
    averages: {
      periods: Record<string, number | null>;
      general: number | null;
    };
    rank: { annual: Position; periods: Record<string, Position> } | null;
  };
}

type Card = PrintableReportCard['reportCard'];
type Subject = Card['subjects'][number];

const MARGIN = 40;
const COLORS = {
  text: '#111827',
  muted: '#6b7280',
  border: '#d1d5db',
  band: '#f3f4f6',
  failing: '#b91c1c',
};
const FONT = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique',
};

const fullName = ({ firstName, lastName }: Person) =>
  `${firstName} ${lastName}`;

// Boletines listos para imprimir (carta), uno o varios en un mismo archivo:
// cada estudiante empieza en una página nueva. periodId: boletín de ese
// periodo (muestra los periodos hasta él); sin periodo, el informe final.
const renderReportCardsPdf = (
  cards: PrintableReportCard[],
  { periodId, title }: { periodId?: string; title: string },
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: MARGIN,
      bufferPages: true,
      info: { Title: title, Author: cards[0]?.organization.name ?? '' },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    cards.forEach((card, index) => {
      if (index > 0) doc.addPage();
      drawCard(doc, card, periodId);
    });

    const generatedAt = new Date().toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const { start, count } = doc.bufferedPageRange();
    for (let page = start; page < start + count; page++) {
      doc.switchToPage(page);
      // El pie va en el margen inferior: sin esto pdfkit abriría otra página.
      doc.page.margins.bottom = 0;
      doc
        .font(FONT.regular)
        .fontSize(7)
        .fillColor(COLORS.muted)
        .text(
          `Generado el ${generatedAt}`,
          MARGIN,
          doc.page.height - MARGIN + 12,
          { width: contentWidth(doc), align: 'right', lineBreak: false },
        );
    }
    doc.end();
  });

export default renderReportCardsPdf;

const contentWidth = (doc: PDFKit.PDFDocument) => doc.page.width - MARGIN * 2;

const bottom = (doc: PDFKit.PDFDocument) => doc.page.height - MARGIN;

// Pasa a otra página si el bloque no cabe en lo que queda de esta.
const ensureSpace = (doc: PDFKit.PDFDocument, height: number) => {
  if (doc.y + height > bottom(doc)) doc.addPage();
};

function drawCard(
  doc: PDFKit.PDFDocument,
  { organization, student, reportCard: card }: PrintableReportCard,
  periodId?: string,
) {
  const selected = card.periods.find(({ id }) => id === periodId) ?? null;
  const periods = selected
    ? card.periods.filter(({ orderIndex }) => orderIndex <= selected.orderIndex)
    : card.periods;
  const format = (score: number | null) =>
    score === null ? '—' : score.toFixed(card.scale.decimalPlaces);

  drawHeader(doc, organization.name, student, card, selected?.name ?? null);

  for (const subject of card.subjects)
    drawSubject(doc, subject, periods, selected?.id ?? null, card, format);

  drawSummary(doc, periods, selected?.id ?? null, card, format);
  drawSignatures(doc, card.classroom.homeroomTeacher);
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  organizationName: string,
  student: PrintableReportCard['student'],
  card: Card,
  periodName: string | null,
) {
  const width = contentWidth(doc);
  doc
    .fillColor(COLORS.text)
    .font(FONT.bold)
    .fontSize(14)
    .text(organizationName.toUpperCase(), MARGIN, MARGIN, {
      width,
      align: 'center',
    })
    .font(FONT.regular)
    .fontSize(11)
    .text('Boletín de calificaciones', { width, align: 'center' })
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(
      `Año lectivo ${card.academicYear.name} · ${periodName ? `Periodo: ${periodName}` : 'Informe final'}`,
      { width, align: 'center' },
    );

  const rows: [string, string, string, string][] = [
    [
      'Estudiante',
      `${student.lastName} ${student.firstName}`,
      'Documento',
      `${student.documentType} ${student.documentNumber}`,
    ],
    [
      'Grado y salón',
      [card.classroom.gradeLevel?.name, card.classroom.name]
        .filter(Boolean)
        .join(' · '),
      'Código',
      student.studentCode,
    ],
    [
      'Director(a) de grupo',
      card.classroom.homeroomTeacher
        ? fullName(card.classroom.homeroomTeacher)
        : '—',
      '',
      '',
    ],
  ];
  const top = doc.y + 8;
  const rowHeight = 15;
  doc
    .lineWidth(0.5)
    .strokeColor(COLORS.border)
    .rect(MARGIN, top, width, rows.length * rowHeight + 8)
    .stroke();
  rows.forEach(([label, value, label2, value2], index) => {
    const y = top + 6 + index * rowHeight;
    labeled(doc, label, value, MARGIN + 8, y, width * 0.62 - 8);
    if (label2)
      labeled(doc, label2, value2, MARGIN + width * 0.62, y, width * 0.38 - 8);
  });
  doc.y = top + rows.length * rowHeight + 18;
}

function labeled(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
) {
  doc
    .font(FONT.bold)
    .fontSize(8.5)
    .fillColor(COLORS.muted)
    .text(`${label}: `, x, y, { continued: true, width, lineBreak: false })
    .font(FONT.regular)
    .fillColor(COLORS.text)
    .text(value, { lineBreak: false });
}

// Estado de la materia: en el informe final, el del año (con la recuperación);
// en un periodo, si su definitiva aprueba.
const statusOf = (
  subject: Subject,
  periodId: string | null,
  passingScore: number,
) => {
  if (periodId) {
    const score = subject.periods[periodId]?.score ?? null;
    if (score === null) return 'Sin nota';
    return score >= passingScore ? 'Aprobado' : 'Reprobado';
  }
  const { annual, recovery } = subject;
  if (!annual.status) return 'Sin notas';
  if (recovery)
    return annual.status === 'passing' ? 'Recuperada' : 'No recuperó';
  if (annual.status === 'passing')
    return annual.complete ? 'Aprobada' : 'Aprobando';
  if (annual.status === 'at_risk') return 'En riesgo';
  return 'Reprobada';
};

// Promedio de los periodos impresos ponderado por su peso (sin redondeo
// intermedio): la definitiva acumulada a la fecha del boletín.
const accumulatedTo = (
  subject: Subject,
  periods: Card['periods'],
  decimalPlaces: number,
) =>
  weightedAverage(
    periods.map(({ id, weightPercentage }) => ({
      score: subject.periods[id]?.score ?? null,
      weight: weightPercentage,
    })),
    decimalPlaces,
  );

// Texto del recuadro de la materia: concepto(s) del profesor y observación.
const conceptLines = (
  subject: Subject,
  periods: Card['periods'],
  periodId: string | null,
  format: (score: number | null) => string,
) => {
  const lines: { label: string; text: string; italic?: boolean }[] = [];
  if (periodId) {
    const result = subject.periods[periodId];
    if (result?.score != null)
      lines.push({
        label: 'Concepto',
        text: result.concept ?? 'Sin concepto registrado para esta nota.',
      });
    if (result?.observation)
      lines.push({
        label: 'Observación',
        text: result.observation,
        italic: true,
      });
    return lines;
  }

  for (const period of periods) {
    const result = subject.periods[period.id];
    if (result?.concept)
      lines.push({ label: period.name, text: result.concept });
    if (result?.observation)
      lines.push({
        label: `Observación ${period.name}`,
        text: result.observation,
        italic: true,
      });
  }
  if (subject.recovery)
    lines.push({
      label: 'Recuperación',
      text: `${subject.annual.status === 'passing' ? 'Aprobó por recuperación' : 'Presentó recuperación'} con ${format(subject.recovery.score)}${subject.recovery.originalScore !== null ? ` (acumulado de los periodos: ${format(subject.recovery.originalScore)})` : ''}.`,
    });
  if (subject.finalConcept)
    lines.push({ label: 'Concepto final', text: subject.finalConcept });
  return lines;
};

function drawSubject(
  doc: PDFKit.PDFDocument,
  subject: Subject,
  periods: Card['periods'],
  periodId: string | null,
  card: Card,
  format: (score: number | null) => string,
) {
  const width = contentWidth(doc);
  const { passingScore, decimalPlaces } = card.scale;
  const lines = conceptLines(subject, periods, periodId, format);

  doc.fontSize(8.5);
  const boxText = (line: (typeof lines)[number]) =>
    `${line.label}: ${line.text}`;
  const textHeight = lines.reduce(
    (sum, line) =>
      sum + doc.heightOfString(boxText(line), { width: width - 16 }) + 2,
    0,
  );
  const bandHeight = 18;
  const tableHeight = 30;
  const boxHeight = lines.length ? textHeight + 10 : 0;
  ensureSpace(doc, bandHeight + tableHeight + boxHeight + 8);

  const top = doc.y;
  // Banda con el nombre de la materia, el profesor y la intensidad horaria.
  doc.rect(MARGIN, top, width, bandHeight).fill(COLORS.band);
  doc
    .fillColor(COLORS.text)
    .font(FONT.bold)
    .fontSize(9.5)
    .text(subject.subject.name, MARGIN + 6, top + 5, {
      width: width * 0.55,
      lineBreak: false,
      ellipsis: true,
    });
  doc
    .font(FONT.regular)
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(
      [
        subject.teacher ? `Prof. ${fullName(subject.teacher)}` : 'Sin docente',
        subject.weeklyHours ? `IH ${subject.weeklyHours} h/sem` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      MARGIN + width * 0.55,
      top + 6,
      { width: width * 0.45 - 6, align: 'right', lineBreak: false },
    );

  // Notas por periodo, definitiva y estado.
  const finalScore = periodId
    ? accumulatedTo(subject, periods, decimalPlaces)
    : subject.annual.projected;
  const columns = [
    ...periods.map((period) => ({
      label: `${period.name} (${period.weightPercentage}%)`,
      value: format(subject.periods[period.id]?.score ?? null),
      failing:
        (subject.periods[period.id]?.score ?? passingScore) < passingScore,
    })),
    {
      label: periodId
        ? 'Acumulado'
        : subject.recovery
          ? 'Definitiva (rec.)'
          : 'Definitiva',
      value: format(finalScore),
      failing: finalScore !== null && finalScore < passingScore,
      bold: true,
    },
    {
      label: 'Desempeño',
      value: statusOf(subject, periodId, passingScore),
      failing: false,
    },
  ];
  const columnWidth = width / columns.length;
  const tableTop = top + bandHeight;
  doc
    .lineWidth(0.5)
    .strokeColor(COLORS.border)
    .rect(MARGIN, tableTop, width, tableHeight)
    .stroke();
  columns.forEach((column, index) => {
    const x = MARGIN + index * columnWidth;
    if (index > 0)
      doc
        .moveTo(x, tableTop)
        .lineTo(x, tableTop + tableHeight)
        .stroke();
    doc
      .font(FONT.regular)
      .fontSize(7)
      .fillColor(COLORS.muted)
      .text(column.label, x + 2, tableTop + 4, {
        width: columnWidth - 4,
        align: 'center',
        lineBreak: false,
        ellipsis: true,
      })
      .font('bold' in column && column.bold ? FONT.bold : FONT.regular)
      .fontSize(10)
      .fillColor(column.failing ? COLORS.failing : COLORS.text)
      .text(column.value, x + 2, tableTop + 15, {
        width: columnWidth - 4,
        align: 'center',
        lineBreak: false,
      });
  });

  // Recuadro con el concepto evaluativo y la observación.
  let y = tableTop + tableHeight;
  if (lines.length) {
    doc.rect(MARGIN, y, width, boxHeight).stroke();
    y += 5;
    for (const line of lines) {
      doc
        .font(FONT.bold)
        .fontSize(8.5)
        .fillColor(COLORS.text)
        .text(`${line.label}: `, MARGIN + 8, y, {
          width: width - 16,
          continued: true,
        })
        .font(line.italic ? FONT.italic : FONT.regular)
        .text(line.text);
      y = doc.y + 2;
    }
    y = tableTop + tableHeight + boxHeight;
  }
  doc.y = y + 8;
  doc.x = MARGIN;
}

function drawSummary(
  doc: PDFKit.PDFDocument,
  periods: Card['periods'],
  periodId: string | null,
  card: Card,
  format: (score: number | null) => string,
) {
  const width = contentWidth(doc);
  const { scale, averages, rank, subjects } = card;
  const general = periodId
    ? weightedAverage(
        subjects.map((subject) => ({
          score: accumulatedTo(subject, periods, scale.decimalPlaces),
          weight: subject.weightInGpa,
        })),
        scale.decimalPlaces,
      )
    : averages.general;

  const headers = [...periods.map(({ name }) => name), 'General'];
  const rows: [string, string[]][] = [
    [
      'Promedio',
      [
        ...periods.map(({ id }) => format(averages.periods[id] ?? null)),
        format(
          general === null ? null : roundScore(general, scale.decimalPlaces),
        ),
      ],
    ],
  ];
  if (rank && scale.showRankInReportCard) {
    const position = (value: Position) =>
      value ? `${value.position} de ${value.total}` : '—';
    rows.push([
      'Puesto en el salón',
      [
        ...periods.map(({ id }) => position(rank.periods[id] ?? null)),
        position(rank.annual),
      ],
    ]);
  }

  const rowHeight = 16;
  const labelWidth = 110;
  const height = rowHeight * (rows.length + 1);
  ensureSpace(doc, height + 110);

  const top = doc.y + 4;
  const columnWidth = (width - labelWidth) / headers.length;
  doc.rect(MARGIN, top, width, rowHeight).fill(COLORS.band);
  doc
    .lineWidth(0.5)
    .strokeColor(COLORS.border)
    .rect(MARGIN, top, width, height)
    .stroke();
  doc
    .font(FONT.bold)
    .fontSize(8.5)
    .fillColor(COLORS.text)
    .text('Resumen', MARGIN + 6, top + 4, {
      width: labelWidth - 6,
      lineBreak: false,
    });
  headers.forEach((header, index) =>
    doc.text(header, MARGIN + labelWidth + index * columnWidth, top + 4, {
      width: columnWidth,
      align: 'center',
      lineBreak: false,
    }),
  );
  rows.forEach(([label, values], rowIndex) => {
    const y = top + rowHeight * (rowIndex + 1) + 4;
    doc
      .font(FONT.bold)
      .fillColor(COLORS.muted)
      .text(label, MARGIN + 6, y, {
        width: labelWidth - 6,
        lineBreak: false,
      });
    values.forEach((value, index) =>
      doc
        .font(FONT.regular)
        .fillColor(COLORS.text)
        .text(value, MARGIN + labelWidth + index * columnWidth, y, {
          width: columnWidth,
          align: 'center',
          lineBreak: false,
        }),
    );
  });
  doc
    .font(FONT.regular)
    .fontSize(7.5)
    .fillColor(COLORS.muted)
    .text(
      `Escala hasta ${format(scale.maxScore)} · se aprueba con ${format(scale.passingScore)}.`,
      MARGIN,
      top + height + 4,
      { width },
    );
  doc.y = top + height + 18;
}

function drawSignatures(
  doc: PDFKit.PDFDocument,
  homeroomTeacher: Person | null,
) {
  const width = contentWidth(doc);
  ensureSpace(doc, 70);
  const y = Math.max(doc.y + 45, bottom(doc) - 40);
  const lineWidth = width * 0.38;
  const signatures = [
    { x: MARGIN, label: 'Rector(a) / Coordinación', name: null },
    {
      x: MARGIN + width - lineWidth,
      label: 'Director(a) de grupo',
      name: homeroomTeacher ? fullName(homeroomTeacher) : null,
    },
  ];
  doc.lineWidth(0.7).strokeColor(COLORS.text);
  for (const { x, label, name } of signatures) {
    doc
      .moveTo(x, y)
      .lineTo(x + lineWidth, y)
      .stroke();
    doc
      .font(FONT.regular)
      .fontSize(8)
      .fillColor(COLORS.text)
      .text(name ?? ' ', x, y + 4, {
        width: lineWidth,
        align: 'center',
        lineBreak: false,
      })
      .fillColor(COLORS.muted)
      .text(label, x, y + 14, {
        width: lineWidth,
        align: 'center',
        lineBreak: false,
      });
  }
}
