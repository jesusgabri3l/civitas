export interface ModelConfig {
  stylobateLength: number;
  stylobateWidth: number;
  columnsLong: number;
  columnsShort: number;
  columnHeight: number;
  columnBaseDiameter: number;
  columnTopRatio: number;
  entasis: number;
  /** Facets of a drum: with flat shading each one reads as a flute. */
  fluteCount: number;
  pedimentHeight: number;
}

/**
 * Medidas derivadas del templo, en metros. Origen: centro del templo; las alturas se miden desde la base del primer escalón.
 * El eje largo es X (frentes con frontón en +X y -X); el eje corto es Z. Proporciones del Partenon real
 * (estilobato 69.5 x 30.9 m, columnas de ~10.4 m, entablamento de ~4 m, frontón de ~3.5 m).
 */
export interface ParthenonDimensions {
  config: ModelConfig;
  stepRise: number;
  stepTread: number;
  stylobateTop: number;
  /** Semiejes del rectangulo que une los ejes de las columnas del peristilo. */
  axisHalfX: number;
  axisHalfZ: number;
  columnBase: number;
  columnTop: number;
  capitalHeight: number;
  abacusWidth: number;
  columnTopY: number;
  architraveHeight: number;
  friezeHeight: number;
  geisonHeight: number;
  architraveTopY: number;
  friezeTopY: number;
  geisonTopY: number;
  /** Mitad del grosor del arquitrabe, medido desde el eje de las columnas hacia afuera. */
  architraveHalf: number;
  /** Cara exterior del nucleo del friso (las metopas quedan hundidas respecto al arquitrabe). */
  friezeCoreHalf: number;
  geisonOverhang: number;
  geisonOuterHalf: number;
  pedimentHeight: number;
  /** Cella (muro interior) y pronaos. */
  cellaHalfX: number;
  cellaHalfZ: number;
  cellaWall: number;
  pronaosColumnX: number;
  pronaosScale: number;
  pronaosColumns: number;
  pronaosSpan: number;
}

export function deriveDimensions(config: ModelConfig): ParthenonDimensions {
  const stepRise = 0.56;
  const stepTread = 1.05;
  const stylobateTop = stepRise * 3;
  const columnBase = config.columnBaseDiameter;
  const columnTop = columnBase * config.columnTopRatio;
  const scale = columnBase / 1.905;
  const capitalHeight = 1.2 * scale;
  const abacusWidth = 2.15 * scale;
  const columnTopY = stylobateTop + config.columnHeight;
  const architraveHeight = 1.35 * scale;
  const friezeHeight = 1.33 * scale;
  const geisonHeight = 0.55 * scale;
  const architraveHalf = abacusWidth / 2;
  const geisonOverhang = 0.95 * scale;
  const pronaosScale = 0.9;
  return {
    config,
    stepRise,
    stepTread,
    stylobateTop,
    axisHalfX: (config.stylobateLength - columnBase) / 2,
    axisHalfZ: (config.stylobateWidth - columnBase) / 2,
    columnBase,
    columnTop,
    capitalHeight,
    abacusWidth,
    columnTopY,
    architraveHeight,
    friezeHeight,
    geisonHeight,
    architraveTopY: columnTopY + architraveHeight,
    friezeTopY: columnTopY + architraveHeight + friezeHeight,
    geisonTopY: columnTopY + architraveHeight + friezeHeight + geisonHeight,
    architraveHalf,
    friezeCoreHalf: architraveHalf - 0.25 * scale,
    geisonOverhang,
    geisonOuterHalf: architraveHalf + geisonOverhang,
    pedimentHeight: config.pedimentHeight,
    cellaHalfX: Math.min(25, (config.stylobateLength - columnBase) / 2 - 8.8),
    cellaHalfZ: Math.min(10.85, (config.stylobateWidth - columnBase) / 2 - 3.65),
    cellaWall: 1.5,
    pronaosColumnX: Math.min(25, (config.stylobateLength - columnBase) / 2 - 8.8) + 4.1,
    pronaosScale,
    pronaosColumns: 6,
    pronaosSpan: Math.min(10.85, (config.stylobateWidth - columnBase) / 2 - 3.65) - 1.9,
  };
}
