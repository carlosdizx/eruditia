import idUtil from '@common/utils/id.util';

const length = 100000;
const keyLength = 15;
const key = 'TEST';

describe('id.util', () => {
  describe('Generation ids', () => {
    it('should return identifiers uniques in each request', () => {
      const id1 = idUtil(key, keyLength, false);
      const id2 = idUtil(key, keyLength, false);
      const id3 = idUtil(key, keyLength, false);

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id3).toBeDefined();
      expect(id1).not.toEqual(id2);
      expect(id1).not.toEqual(id3);
      expect(id2).not.toEqual(id3);
    });

    it('should return unique ids in each request ', () => {
      const ids: string[] = [];
      for (let i = 0; i < length; i++) {
        const id = idUtil(key, keyLength, true);
        ids.push(id);
      }

      expect(ids.length).toBeGreaterThan(0);
      expect(ids.length).toEqual(length);
    });
  });
});
