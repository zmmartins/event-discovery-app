const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const projectRoot = path.resolve(__dirname, "..");
const eventsDirectory = path.join(projectRoot, "src", "assets", "events");
const generatedDirectories = new Set(["pins", "previews", "details"]);
const sourceExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const variants = [
  {
    directory: "pins",
    quality: 80,
    suffix: "pin",
    transform: (image) =>
      image.resize(160, 160, {
        fit: "cover",
        position: "attention",
      }),
  },
  {
    directory: "previews",
    quality: 84,
    suffix: "preview",
    transform: (image) =>
      image.resize({
        fit: "inside",
        height: 900,
        withoutEnlargement: true,
        width: 900,
      }),
  },
  {
    directory: "details",
    quality: 88,
    suffix: "detail",
    transform: (image) =>
      image.resize({
        fit: "inside",
        height: 1600,
        withoutEnlargement: true,
        width: 1600,
      }),
  },
];

function normalizeBaseName(fileName) {
  return path
    .basename(fileName, path.extname(fileName))
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

async function getSourceImages() {
  const entries = await fs.readdir(eventsDirectory, {
    withFileTypes: true,
  });

  return entries
    .filter((entry) => {
      if (entry.isDirectory()) {
        return !generatedDirectories.has(entry.name);
      }

      return (
        entry.isFile() &&
        sourceExtensions.has(path.extname(entry.name).toLowerCase())
      );
    })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((firstName, secondName) => firstName.localeCompare(secondName));
}

async function ensureVariantDirectories() {
  await Promise.all(
    variants.map((variant) =>
      fs.mkdir(path.join(eventsDirectory, variant.directory), {
        recursive: true,
      })
    )
  );
}

async function generateVariant(sourceFileName, variant) {
  const baseName = normalizeBaseName(sourceFileName);
  const sourcePath = path.join(eventsDirectory, sourceFileName);
  const outputPath = path.join(
    eventsDirectory,
    variant.directory,
    `${baseName}_${variant.suffix}.jpg`
  );

  await variant
    .transform(sharp(sourcePath).rotate())
    .jpeg({
      mozjpeg: true,
      quality: variant.quality,
    })
    .toFile(outputPath);

  return path.relative(projectRoot, outputPath);
}

async function main() {
  const sourceImages = await getSourceImages();

  if (sourceImages.length === 0) {
    console.log("No source event images found.");
    return;
  }

  await ensureVariantDirectories();

  const generatedFiles = [];

  for (const sourceImage of sourceImages) {
    for (const variant of variants) {
      generatedFiles.push(await generateVariant(sourceImage, variant));
    }
  }

  console.log(`Generated ${generatedFiles.length} event image variants.`);
  for (const generatedFile of generatedFiles) {
    console.log(generatedFile);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
