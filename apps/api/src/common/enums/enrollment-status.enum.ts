// Solo IN_PROGRESS es una matrícula activa; el resto es el cierre del año.
enum EnrollmentStatusEnum {
  IN_PROGRESS = 'in_progress',
  PROMOTED = 'promoted',
  FAILED = 'failed',
  WITHDRAWN = 'withdrawn',
  GRADUATED = 'graduated',
  TRANSFERRED = 'transferred',
}

export default EnrollmentStatusEnum;
