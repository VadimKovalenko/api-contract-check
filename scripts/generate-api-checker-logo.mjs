import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { Buffer } from 'node:buffer';

const size = 800;
const supersample = 2;
const renderSize = size * supersample;
const pixels = Buffer.alloc(renderSize * renderSize * 4);

const colors = {
  hexagon: [10, 37, 72, 255],
  cyan: [31, 203, 232, 255],
  teal: [83, 226, 190, 255],
  gold: [245, 192, 77, 255],
  needle: [244, 249, 255, 255],
};

function pointInPolygon(x, y, points) {
  let inside = false;

  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const [currentX, currentY] = points[index];
    const [previousX, previousY] = points[previous];
    const intersects = (
      (currentY > y) !== (previousY > y)
      && x < ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX
    );

    if (intersects) inside = !inside;
  }

  return inside;
}

function distanceToSegment(x, y, startX, startY, endX, endY) {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const lengthSquared = deltaX ** 2 + deltaY ** 2;
  const progress = Math.max(0, Math.min(1, ((x - startX) * deltaX + (y - startY) * deltaY) / lengthSquared));
  const closestX = startX + progress * deltaX;
  const closestY = startY + progress * deltaY;

  return Math.hypot(x - closestX, y - closestY);
}

function colorForArc(angle) {
  if (angle >= -160 && angle <= -114) return colors.cyan;
  if (angle >= -110 && angle <= -68) return colors.teal;
  if (angle >= -64 && angle <= -20) return colors.gold;
  return null;
}

const hexagon = [
  [400, 48],
  [710, 225],
  [710, 575],
  [400, 752],
  [90, 575],
  [90, 225],
];
const centerX = 400;
const centerY = 448;
const outerRadius = 254;
const innerRadius = 202;
const needleAngle = -35 * (Math.PI / 180);
const needleEndX = centerX + Math.cos(needleAngle) * 218;
const needleEndY = centerY + Math.sin(needleAngle) * 218;

for (let row = 0; row < renderSize; row += 1) {
  for (let column = 0; column < renderSize; column += 1) {
    const x = (column + 0.5) / supersample;
    const y = (row + 0.5) / supersample;
    let color = pointInPolygon(x, y, hexagon) ? colors.hexagon : null;

    const radius = Math.hypot(x - centerX, y - centerY);
    const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
    const arcColor = radius >= innerRadius && radius <= outerRadius ? colorForArc(angle) : null;

    if (arcColor) color = arcColor;

    if (distanceToSegment(x, y, centerX, centerY, needleEndX, needleEndY) <= 13) {
      color = colors.needle;
    }

    if (Math.hypot(x - centerX, y - centerY) <= 35) {
      color = colors.needle;
    }

    if (color) {
      const offset = (row * renderSize + column) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = color[3];
    }
  }
}

const logo = Buffer.alloc(size * size * 4);

for (let row = 0; row < size; row += 1) {
  for (let column = 0; column < size; column += 1) {
    const outputOffset = (row * size + column) * 4;
    const values = [0, 0, 0, 0];

    for (let subRow = 0; subRow < supersample; subRow += 1) {
      for (let subColumn = 0; subColumn < supersample; subColumn += 1) {
        const sourceOffset = ((row * supersample + subRow) * renderSize + column * supersample + subColumn) * 4;
        values[0] += pixels[sourceOffset];
        values[1] += pixels[sourceOffset + 1];
        values[2] += pixels[sourceOffset + 2];
        values[3] += pixels[sourceOffset + 3];
      }
    }

    logo[outputOffset] = Math.round(values[0] / 4);
    logo[outputOffset + 1] = Math.round(values[1] / 4);
    logo[outputOffset + 2] = Math.round(values[2] / 4);
    logo[outputOffset + 3] = Math.round(values[3] / 4);
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const value of buffer) {
    crc ^= value;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const name = Buffer.from(type);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));

  return Buffer.concat([length, name, data, checksum]);
}

function createPng(width, height, image) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  const scanlines = Buffer.alloc(height * (width * 4 + 1));

  for (let row = 0; row < height; row += 1) {
    image.copy(scanlines, row * (width * 4 + 1) + 1, row * width * 4, (row + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    createChunk('IHDR', header),
    createChunk('IDAT', deflateSync(scanlines, { level: 9 })),
    createChunk('IEND', Buffer.alloc(0)),
  ]);
}

function scaleImage(targetSize) {
  const scaled = Buffer.alloc(targetSize * targetSize * 4);

  for (let row = 0; row < targetSize; row += 1) {
    for (let column = 0; column < targetSize; column += 1) {
      const sourceRow = Math.min(size - 1, Math.floor((row + 0.5) * size / targetSize));
      const sourceColumn = Math.min(size - 1, Math.floor((column + 0.5) * size / targetSize));
      const sourceOffset = (sourceRow * size + sourceColumn) * 4;
      const targetOffset = (row * targetSize + column) * 4;

      logo.copy(scaled, targetOffset, sourceOffset, sourceOffset + 4);
    }
  }

  return scaled;
}

function createIco() {
  const iconSizes = [16, 32, 48].map((iconSize) => ({
    size: iconSize,
    png: createPng(iconSize, iconSize, scaleImage(iconSize)),
  }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(iconSizes.length, 4);

  let offset = header.length + iconSizes.length * 16;
  const entries = iconSizes.map(({ png, size: iconSize }) => {
    const entry = Buffer.alloc(16);
    entry[0] = iconSize;
    entry[1] = iconSize;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...iconSizes.map(({ png }) => png)]);
}

writeFileSync('src/assets/api-checker-logo.png', createPng(size, size, logo));
writeFileSync('public/favicon.ico', createIco());
