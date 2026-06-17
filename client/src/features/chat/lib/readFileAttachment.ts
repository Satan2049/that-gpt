export async function readFileAsBase64Data(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const comma = dataUrl.indexOf(",");
  if (comma === -1) {
    throw new Error("Invalid file data");
  }
  return dataUrl.slice(comma + 1);
}
