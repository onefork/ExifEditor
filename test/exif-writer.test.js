import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import piexif from 'piexifjs';
import { writeExif } from '../src/core/exif-writer.js';

// 创建测试 JPEG 的辅助函数
async function createTestJpeg(exifObj = null) {
  const jpegBuffer = await sharp({
    create: { width: 10, height: 10, background: { r: 255, g: 0, b: 0 }, channels: 3 }
  }).jpeg().toBuffer();

  let binaryString = jpegBuffer.toString('binary');
  if (exifObj) {
    const exifBytes = piexif.dump(exifObj);
    binaryString = piexif.insert(exifBytes, binaryString);
  }
  return Buffer.from(binaryString, 'binary');
}

// 创建 File-like 对象
function createFileLike(buffer, name, type) {
  return {
    name,
    type,
    arrayBuffer: async () =>
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  };
}

// 从 Blob 读取 EXIF
async function readExifFromBlob(blob) {
  const buffer = Buffer.from(await blob.arrayBuffer());
  const binaryString = buffer.toString('binary');
  return piexif.load(binaryString);
}

// 将 Blob 转为 File-like 对象（便于二次写入）
async function blobToFileLike(blob, name) {
  const buffer = Buffer.from(await blob.arrayBuffer());
  return createFileLike(buffer, name, blob.type || 'image/jpeg');
}

describe('exif-writer', () => {
  describe('GPS 经纬度写入', () => {
    test('正值坐标 → N/E Ref', async () => {
      const jpeg = await createTestJpeg();
      const file = createFileLike(jpeg, 'test.jpg', 'image/jpeg');
      const result = await writeExif(file, {
        gpsLat: { value: 39.9, editedBy: 'user' },
        gpsLng: { value: 116.4, editedBy: 'user' },
      });
      const exifObj = await readExifFromBlob(result);

      assert.equal(exifObj.GPS[piexif.GPSIFD.GPSLatitudeRef], 'N');
      assert.equal(exifObj.GPS[piexif.GPSIFD.GPSLongitudeRef], 'E');

      // GPSLatitude 应为 [[num, den], [num, den], [num, den]] 理性数组
      const lat = exifObj.GPS[piexif.GPSIFD.GPSLatitude];
      assert.ok(Array.isArray(lat), 'GPSLatitude 应为数组');
      assert.equal(lat.length, 3, 'GPSLatitude 应有 3 个 度/分/秒 分量');
      for (const rational of lat) {
        assert.ok(Array.isArray(rational), '每个分量应为理性数组 [num, den]');
        assert.equal(rational.length, 2, '每个理性数组长度应为 2');
        assert.equal(typeof rational[0], 'number');
        assert.equal(typeof rational[1], 'number');
      }

      assert.deepEqual(exifObj.GPS[piexif.GPSIFD.GPSVersionID], [2, 0, 0, 0]);
    });

    test('负值坐标 → S/W Ref', async () => {
      const jpeg = await createTestJpeg();
      const file = createFileLike(jpeg, 'test.jpg', 'image/jpeg');
      const result = await writeExif(file, {
        gpsLat: { value: -33.8688, editedBy: 'user' },
        gpsLng: { value: -151.2093, editedBy: 'user' },
      });
      const exifObj = await readExifFromBlob(result);

      assert.equal(exifObj.GPS[piexif.GPSIFD.GPSLatitudeRef], 'S');
      assert.equal(exifObj.GPS[piexif.GPSIFD.GPSLongitudeRef], 'W');
    });
  });

  describe('日期时间写入', () => {
    test('YYYY-MM-DD HH:MM:SS 转为 EXIF 格式', async () => {
      const jpeg = await createTestJpeg();
      const file = createFileLike(jpeg, 'test.jpg', 'image/jpeg');
      const result = await writeExif(file, {
        dateTimeOriginal: { value: '2025-01-15 09:30:00', editedBy: 'user' },
      });
      const exifObj = await readExifFromBlob(result);

      assert.equal(exifObj.Exif[piexif.ExifIFD.DateTimeOriginal], '2025:01:15 09:30:00');
      assert.equal(exifObj['0th'][piexif.ImageIFD.DateTime], '2025:01:15 09:30:00');
    });
  });

  describe('设备字段写入', () => {
    test('Make/Model/Software 含 ASCII 清理', async () => {
      const jpeg = await createTestJpeg();
      const file = createFileLike(jpeg, 'test.jpg', 'image/jpeg');
      const result = await writeExif(file, {
        make: { value: 'TestCamera\x00\x01', editedBy: 'user' },
        model: { value: 'X100', editedBy: 'user' },
        software: { value: 'v1.0', editedBy: 'user' },
      });
      const exifObj = await readExifFromBlob(result);

      assert.equal(exifObj['0th'][piexif.ImageIFD.Make], 'TestCamera');
      assert.equal(exifObj['0th'][piexif.ImageIFD.Model], 'X100');
      assert.equal(exifObj['0th'][piexif.ImageIFD.Software], 'v1.0');
    });
  });

  describe('清空字段', () => {
    test('value=null + editedBy=user → 删除 GPS 字段', async () => {
      // 先写入 GPS
      const jpeg = await createTestJpeg();
      let file = createFileLike(jpeg, 'test.jpg', 'image/jpeg');
      let result = await writeExif(file, {
        gpsLat: { value: 39.9, editedBy: 'user' },
        gpsLng: { value: 116.4, editedBy: 'user' },
      });

      // 验证已写入
      let exifObj = await readExifFromBlob(result);
      assert.ok(exifObj.GPS[piexif.GPSIFD.GPSLatitude], '写入后 GPSLatitude 应存在');

      // 再清空
      file = await blobToFileLike(result, 'test.jpg');
      result = await writeExif(file, {
        gpsLat: { value: null, editedBy: 'user' },
        gpsLng: { value: null, editedBy: 'user' },
      });

      exifObj = await readExifFromBlob(result);
      assert.equal(exifObj.GPS[piexif.GPSIFD.GPSLatitude], undefined, '清空后 GPSLatitude 应不存在');
      assert.equal(exifObj.GPS[piexif.GPSIFD.GPSLongitude], undefined, '清空后 GPSLongitude 应不存在');
      assert.equal(exifObj.GPS[piexif.GPSIFD.GPSVersionID], undefined, '清空后 GPSVersionID 应不存在');
    });
  });

  describe('损坏 EXIF 回退', () => {
    test('无 EXIF 的 JPEG 仍可写入', async () => {
      const jpeg = await createTestJpeg(); // 不插入 EXIF
      const file = createFileLike(jpeg, 'test.jpg', 'image/jpeg');
      const result = await writeExif(file, {
        make: { value: 'NewMake', editedBy: 'user' },
      });
      const exifObj = await readExifFromBlob(result);
      assert.equal(exifObj['0th'][piexif.ImageIFD.Make], 'NewMake');
    });
  });

  describe('非 JPEG 文件', () => {
    test('PNG 抛 UNSUPPORTED_FORMAT 错误', async () => {
      const pngBuffer = await sharp({
        create: { width: 10, height: 10, background: { r: 0, g: 255, b: 0 }, channels: 3 }
      }).png().toBuffer();
      const pngFile = createFileLike(pngBuffer, 'test.png', 'image/png');

      await assert.rejects(
        () => writeExif(pngFile, {}),
        (err) => {
          assert.equal(err.code, 'UNSUPPORTED_FORMAT');
          return true;
        }
      );
    });
  });
});
