import { DataType, Model } from 'sequelize-typescript';

// Postgres devuelve DECIMAL como string; se expone como número.
const decimalColumn = (field: string, precision = 5, scale = 2) => ({
  type: DataType.DECIMAL(precision, scale),
  get(this: Model) {
    const value: unknown = this.getDataValue(field);
    return value === null || value === undefined ? value : Number(value);
  },
});

export default decimalColumn;
