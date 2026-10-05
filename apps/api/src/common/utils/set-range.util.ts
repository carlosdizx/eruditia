import { ConflictException } from '@nestjs/common';
import DataRangeEnum from '@common/enums/data-range.enum';

interface DateRangeResult {
  dateFirst: Date;
  dateEnd: Date;
}

type SetRangeUtilResult = DateRangeResult;

const calculateDateRange = (range: DataRangeEnum): DateRangeResult => {
  const today = new Date();
  let dateEnd = new Date(today);
  today.setHours(0, 0, 0, 0);
  dateEnd.setHours(23, 59, 59, 999);

  let dateFirst: Date;

  switch (range) {
    case DataRangeEnum.THIS_MONTH:
      dateFirst = new Date(today.getFullYear(), today.getMonth(), 1);
      dateEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      dateEnd.setHours(23, 59, 59, 999);
      break;
    case DataRangeEnum.THIS_WEEK:
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      dateFirst = new Date(today.setDate(diff));
      dateFirst.setHours(0, 0, 0, 0);
      dateEnd = new Date(dateFirst);
      dateEnd.setDate(dateFirst.getDate() + 6);
      dateEnd.setHours(23, 59, 59, 999);
      break;
    case DataRangeEnum.LAST_7_DAYS:
      dateFirst = new Date(today);
      dateFirst.setDate(today.getDate() - 7);
      dateFirst.setHours(0, 0, 0, 0);
      break;
    case DataRangeEnum.LAST_15_DAYS:
      dateFirst = new Date(today);
      dateFirst.setDate(today.getDate() - 15);
      dateFirst.setHours(0, 0, 0, 0);
      break;
    case DataRangeEnum.LAST_30_DAYS:
      dateFirst = new Date(today);
      dateFirst.setDate(today.getDate() - 30);
      dateFirst.setHours(0, 0, 0, 0);
      break;
    case DataRangeEnum.CUSTOM:
      throw new ConflictException('Contacte al administrador');
    default:
      throw new ConflictException('Contacte al administrador');
  }

  return { dateFirst, dateEnd };
};

const setRangeUtil = (
  range?: DataRangeEnum,
  dateFirst?: Date,
  dateEnd?: Date,
): SetRangeUtilResult | null => {
  if (!range) return null;

  if (range === DataRangeEnum.CUSTOM) {
    if (!dateFirst || !dateEnd)
      throw new ConflictException('Fechas requeridas para rango personalizado');

    return { dateFirst, dateEnd };
  }

  return calculateDateRange(range);
};

export { setRangeUtil, calculateDateRange, type SetRangeUtilResult };
