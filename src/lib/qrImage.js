import QRCode from 'qrcode';

// Keep every module an integer number of pixels; arbitrary raster widths can
// make otherwise valid symbols harder for independent decoders to read.
export async function createQrImage(value, minimumWidth = 240) {
  const modules = QRCode.create(value, { errorCorrectionLevel: 'M' }).modules.size;
  const scale = Math.max(4, Math.ceil(minimumWidth / (modules + 8)));
  return {
    src: await QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 4, scale }),
    width: (modules + 8) * scale,
  };
}
