const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#9b8ea0";
  ctx.fillRect(0, 0, size, size);

  // Rounded rect clip (optional visual touch)
  const r = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = "#9b8ea0";
  ctx.fill();

  // White text
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.floor(size * 0.32)}px sans-serif`;
  ctx.fillText("分攤", size / 2, size / 2);

  return canvas.toBuffer("image/png");
}

const publicDir = path.join(__dirname, "..", "public");

fs.writeFileSync(path.join(publicDir, "icon-192.png"), generateIcon(192));
console.log("✅ icon-192.png generated");

fs.writeFileSync(path.join(publicDir, "icon-512.png"), generateIcon(512));
console.log("✅ icon-512.png generated");
