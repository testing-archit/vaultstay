import type { PropertyMetadata } from "./types";

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const MOCK = !PINATA_JWT;

export async function uploadToIPFS(file: File): Promise<string> {
  if (MOCK) {
    console.warn("Mock IPFS Upload (File)");
    return new Promise((resolve) =>
      setTimeout(
        () => resolve("bafkreifzjuqb5p3jthn3qszj5njybbmwhdptwwhff3m476ntm6e2b6pvyy"),
        1000
      )
    );
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to pin file to IPFS");
  const data = await res.json();
  return data.IpfsHash as string;
}

export async function uploadMultipleToIPFS(files: File[]): Promise<string[]> {
  if (MOCK) {
    console.warn("Mock IPFS Upload (Multiple Files)");
    return new Promise((resolve) =>
      setTimeout(
        () =>
          resolve([
            "bafkreifzjuqb5p3jthn3qszj5njybbmwhdptwwhff3m476ntm6e2b6pvyy",
            "bafkreibmjsm3gxw4u5i4p5z4x4v5h5h5p5r5z5x5v5h5",
            "bafkreibmjsm3gxw4u5i4p5z4x4v5h5h5p5r5z5x5v5h6",
          ]),
        1500
      )
    );
  }

  return Promise.all(files.map((file) => uploadToIPFS(file)));
}

export async function uploadMetadata(obj: object): Promise<string> {
  if (MOCK) {
    console.warn("Mock IPFS Upload (Metadata)");
    return new Promise((resolve) =>
      setTimeout(
        () => resolve("bafkreihq5xjq6mjsm3gxw4u5i4p5z4x4v5h5h5p5r5z5x5v5h5"),
        1000
      )
    );
  }

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify({ pinningOptions: { cidVersion: 1 }, pinataContent: obj }),
  });

  if (!res.ok) throw new Error("Failed to pin JSON to IPFS");
  const data = await res.json();
  return data.IpfsHash as string;
}

export function resolveIPFS(cid: string): string {
  if (!cid) return "";
  if (cid.startsWith("http")) return cid;
  if (cid.startsWith("ipfs://")) cid = cid.replace("ipfs://", "");

  if (MOCK) {
    const mockMap: Record<string, string> = {
      "bafkreifzjuqb5p3jthn3qszj5njybbmwhdptwwhff3m476ntm6e2b6pvyy":
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1000",
      "bafkreibmjsm3gxw4u5i4p5z4x4v5h5h5p5r5z5x5v5h5":
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1000",
      "bafkreibmjsm3gxw4u5i4p5z4x4v5h5h5p5r5z5x5v5h6":
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=1000",
    };
    return (
      mockMap[cid] ||
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1000"
    );
  }

  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

export async function fetchMetadata(cid: string): Promise<PropertyMetadata> {
  if (
    MOCK &&
    cid === "bafkreihq5xjq6mjsm3gxw4u5i4p5z4x4v5h5h5p5r5z5x5v5h5"
  ) {
    return {
      name: "Luxury Mock Property",
      description: "A beautiful property in the heart of the city.",
      imageCID: "bafkreifzjuqb5p3jthn3qszj5njybbmwhdptwwhff3m476ntm6e2b6pvyy",
      images: [
        "bafkreifzjuqb5p3jthn3qszj5njybbmwhdptwwhff3m476ntm6e2b6pvyy",
        "bafkreibmjsm3gxw4u5i4p5z4x4v5h5h5p5r5z5x5v5h5",
        "bafkreibmjsm3gxw4u5i4p5z4x4v5h5h5p5r5z5x5v5h6",
      ],
    };
  }

  try {
    const res = await fetch(resolveIPFS(cid));
    return (await res.json()) as PropertyMetadata;
  } catch {
    return { name: "Unknown", description: "Could not load metadata", imageCID: "" };
  }
}
