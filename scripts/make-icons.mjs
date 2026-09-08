import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
const svg=await readFile('public/icons/icon.svg');
for(const [name,size] of [['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180]]) await sharp(svg).resize(size,size).png().toFile('public/icons/'+name);
const mask='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#153f32"/><text x="246" y="346" text-anchor="middle" font-family="Arial,sans-serif" font-size="270" font-weight="900" font-style="italic" fill="#d6ee8e">R</text></svg>';
await sharp(Buffer.from(mask)).png().toFile('public/icons/icon-maskable.png');

