import DataRangeEnum from '@common/enums/data-range.enum';
import { calculateDateRange, setRangeUtil } from '@common/utils/set-range.util';

const freezeAt = (date: Date) => {
  jest.useFakeTimers();
  jest.setSystemTime(date);
};

const expectStartOfDay = (date: Date) => {
  expect(date.getHours()).toBe(0);
  expect(date.getMinutes()).toBe(0);
  expect(date.getSeconds()).toBe(0);
  expect(date.getMilliseconds()).toBe(0);
};

const expectEndOfDay = (date: Date) => {
  expect(date.getHours()).toBe(23);
  expect(date.getMinutes()).toBe(59);
  expect(date.getSeconds()).toBe(59);
  expect(date.getMilliseconds()).toBe(999);
};

const expectYmd = (date: Date, y: number, m: number, d: number) => {
  expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([
    y,
    m,
    d,
  ]);
};

describe('set-range.util', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('calculate date range', () => {
    describe('THIS_MONTH', () => {
      it('returns first and last day of the current month', () => {
        freezeAt(new Date(2026, 8, 20, 15, 30)); // 20 sep 2026

        const { dateFirst, dateEnd } = calculateDateRange(
          DataRangeEnum.THIS_MONTH,
        );

        expectYmd(dateFirst, 2026, 8, 1);
        expectYmd(dateEnd, 2026, 8, 30);
        expectStartOfDay(dateFirst);
        expectEndOfDay(dateEnd);
      });

      it('handles a month with 31 days', () => {
        freezeAt(new Date(2025, 11, 15)); // dec 2025

        const { dateFirst, dateEnd } = calculateDateRange(
          DataRangeEnum.THIS_MONTH,
        );

        expectYmd(dateFirst, 2025, 11, 1);
        expectYmd(dateEnd, 2025, 11, 31);
      });

      it('handles february in a leap year', () => {
        freezeAt(new Date(2024, 1, 10));

        const { dateEnd } = calculateDateRange(DataRangeEnum.THIS_MONTH);

        expectYmd(dateEnd, 2024, 1, 29);
      });

      it('handles february in a non leap year', () => {
        freezeAt(new Date(2025, 1, 10));

        const { dateEnd } = calculateDateRange(DataRangeEnum.THIS_MONTH);

        expectYmd(dateEnd, 2025, 1, 28);
      });

      it('works on the first day of the month at 00:00', () => {
        freezeAt(new Date(2026, 4, 1, 0, 0, 0, 0));

        const { dateFirst, dateEnd } = calculateDateRange(
          DataRangeEnum.THIS_MONTH,
        );

        expectYmd(dateFirst, 2026, 4, 1);
        expectYmd(dateEnd, 2026, 4, 31);
      });

      it('works on the last day of the month at 23:59:59', () => {
        freezeAt(new Date(2026, 4, 31, 23, 59, 59, 999));

        const { dateFirst, dateEnd } = calculateDateRange(
          DataRangeEnum.THIS_MONTH,
        );

        expectYmd(dateFirst, 2026, 4, 1);
        expectYmd(dateEnd, 2026, 4, 31);
        expectEndOfDay(dateEnd);
      });
    });

    describe('THIS_WEEK', () => {
      it('starts on monday and ends on sunday (midweek)', () => {
        freezeAt(new Date(2026, 8, 16, 12)); // wednesday

        const { dateFirst, dateEnd } = calculateDateRange(
          DataRangeEnum.THIS_WEEK,
        );

        expect(dateFirst.getDay()).toBe(1);
        expect(dateEnd.getDay()).toBe(0);
        expectYmd(dateFirst, 2026, 8, 14);
        expectYmd(dateEnd, 2026, 8, 20);
        expectStartOfDay(dateFirst);
        expectEndOfDay(dateEnd);
      });

      it('treats sunday as the last day of the week', () => {
        freezeAt(new Date(2026, 8, 20, 10)); // sunday

        const { dateFirst, dateEnd } = calculateDateRange(
          DataRangeEnum.THIS_WEEK,
        );

        expectYmd(dateFirst, 2026, 8, 14);
        expectYmd(dateEnd, 2026, 8, 20);
      });

      it('when today is monday the week starts today', () => {
        freezeAt(new Date(2026, 8, 14, 10)); // monday

        const { dateFirst, dateEnd } = calculateDateRange(
          DataRangeEnum.THIS_WEEK,
        );

        expectYmd(dateFirst, 2026, 8, 14);
        expectYmd(dateEnd, 2026, 8, 20);
      });

      it('crosses to the next month', () => {
        freezeAt(new Date(2026, 9, 1)); // thursday 1 oct

        const { dateFirst, dateEnd } = calculateDateRange(
          DataRangeEnum.THIS_WEEK,
        );

        expectYmd(dateFirst, 2026, 8, 28);
        expectYmd(dateEnd, 2026, 9, 4);
      });

      it('crosses to the next year', () => {
        freezeAt(new Date(2026, 0, 1)); // thursday 1 jan

        const { dateFirst, dateEnd } = calculateDateRange(
          DataRangeEnum.THIS_WEEK,
        );

        expectYmd(dateFirst, 2025, 11, 29);
        expectYmd(dateEnd, 2026, 0, 4);
      });

      it('always spans exactly 7 days', () => {
        freezeAt(new Date(2026, 2, 5));

        const { dateFirst, dateEnd } = calculateDateRange(
          DataRangeEnum.THIS_WEEK,
        );

        const days = Math.round(
          (dateEnd.getTime() - dateFirst.getTime()) / 86_400_000,
        );
        expect(days).toBe(7);
      });
    });

    describe.each([
      ['LAST_7_DAYS', DataRangeEnum.LAST_7_DAYS, 7],
      ['LAST_15_DAYS', DataRangeEnum.LAST_15_DAYS, 15],
      ['LAST_30_DAYS', DataRangeEnum.LAST_30_DAYS, 30],
    ])('%s', (_name, range, days) => {
      it(`starts ${days} days ago at 00:00 and ends today at 23:59:59.999`, () => {
        freezeAt(new Date(2026, 8, 20, 14, 45));

        const { dateFirst, dateEnd } = calculateDateRange(range);

        const expected = new Date(2026, 8, 20 - days);
        expectYmd(
          dateFirst,
          expected.getFullYear(),
          expected.getMonth(),
          expected.getDate(),
        );
        expectStartOfDay(dateFirst);
        expectYmd(dateEnd, 2026, 8, 20);
        expectEndOfDay(dateEnd);
      });

      it('crosses month and year boundaries', () => {
        freezeAt(new Date(2026, 0, 3));

        const { dateFirst, dateEnd } = calculateDateRange(range);

        const expected = new Date(2026, 0, 3 - days);
        expectYmd(
          dateFirst,
          expected.getFullYear(),
          expected.getMonth(),
          expected.getDate(),
        );
        expect(dateFirst.getFullYear()).toBe(2025);
        expectYmd(dateEnd, 2026, 0, 3);
      });

      it('dateFirst is always before dateEnd', () => {
        freezeAt(new Date(2026, 5, 15));

        const { dateFirst, dateEnd } = calculateDateRange(range);

        expect(dateFirst.getTime()).toBeLessThan(dateEnd.getTime());
      });
    });

    it('does not depend on the time of day', () => {
      freezeAt(new Date(2026, 8, 20, 0, 0, 0, 0));
      const morning = calculateDateRange(DataRangeEnum.LAST_7_DAYS);

      freezeAt(new Date(2026, 8, 20, 23, 59, 59, 999));
      const night = calculateDateRange(DataRangeEnum.LAST_7_DAYS);

      expect(morning.dateFirst.getTime()).toBe(night.dateFirst.getTime());
      expect(morning.dateEnd.getTime()).toBe(night.dateEnd.getTime());
    });

    it('throws for CUSTOM', () => {
      expect(() => calculateDateRange(DataRangeEnum.CUSTOM)).toThrow(
        'Contacte al administrador',
      );
    });

    it('throws for an unknown range', () => {
      expect(() => calculateDateRange('99' as DataRangeEnum)).toThrow(
        'Contacte al administrador',
      );
    });
  });

  describe('setRangeUtil', () => {
    it('returns null when no range is given', () => {
      expect(setRangeUtil()).toBeNull();
      expect(setRangeUtil(undefined, new Date(), new Date())).toBeNull();
    });

    it('returns the given dates for CUSTOM', () => {
      const dateFirst = new Date(2026, 0, 1);
      const dateEnd = new Date(2026, 0, 31);

      const result = setRangeUtil(DataRangeEnum.CUSTOM, dateFirst, dateEnd);

      expect(result).toEqual({ dateFirst, dateEnd });
    });

    it('throws for CUSTOM without dates', () => {
      expect(() => setRangeUtil(DataRangeEnum.CUSTOM)).toThrow(
        'Fechas requeridas',
      );
      expect(() =>
        setRangeUtil(DataRangeEnum.CUSTOM, new Date(), undefined),
      ).toThrow('Fechas requeridas');
      expect(() =>
        setRangeUtil(DataRangeEnum.CUSTOM, undefined, new Date()),
      ).toThrow('Fechas requeridas');
    });

    it('ignores custom dates when range is not CUSTOM', () => {
      freezeAt(new Date(2026, 8, 20));

      const result = setRangeUtil(
        DataRangeEnum.LAST_7_DAYS,
        new Date(2000, 0, 1),
        new Date(2000, 0, 2),
      );

      expect(result).toEqual(calculateDateRange(DataRangeEnum.LAST_7_DAYS));
    });

    it.each([
      DataRangeEnum.THIS_MONTH,
      DataRangeEnum.THIS_WEEK,
      DataRangeEnum.LAST_7_DAYS,
      DataRangeEnum.LAST_15_DAYS,
      DataRangeEnum.LAST_30_DAYS,
    ])('delegates to calculateDateRange for range %s', (range) => {
      freezeAt(new Date(2026, 8, 20));

      expect(setRangeUtil(range)).toEqual(calculateDateRange(range));
    });
  });
});
