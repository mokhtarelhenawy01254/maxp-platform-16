jest.mock("../../config/environment", () => ({
  envConfig: {
    apiUrl: "/api/v1",
    backendUrl: "http://localhost:3007",
  },
}));

import {
  buildOptimizedUploadImageUrl,
  buildResponsiveUploadImage,
  canOptimizeUploadImage,
  getImageCandidates,
  getImageUrl,
  getPrimaryImageUrl,
  shouldProxyRemoteImageUrl,
} from "../imageUrl";

describe("imageUrl helpers", () => {
  it("reads the first image from API arrays without requiring JSON.parse", () => {
    expect(
      getPrimaryImageUrl([
        "/uploads/products/manual-order-item.jpg",
        "/uploads/products/backup.jpg",
      ]),
    ).toContain("/uploads/products/manual-order-item.jpg");
  });

  it("extracts image URLs from JSON strings that contain image objects", () => {
    expect(
      getPrimaryImageUrl(
        '[{"url":"/uploads/products/object-image.jpg"},{"url":"/uploads/products/backup.jpg"}]',
      ),
    ).toContain("/uploads/products/object-image.jpg");
  });

  it("keeps only unique normalized candidates across multiple payload shapes", () => {
    expect(
      getImageCandidates(
        "/uploads/products/dup.jpg",
        '["/uploads/products/dup.jpg"]',
        { url: "/uploads/products/dup.jpg" },
      ),
    ).toHaveLength(1);
  });

  it("keeps external https URLs intact", () => {
    expect(
      getPrimaryImageUrl({ fullUrl: "https://cdn.example.com/item.jpg" }),
    ).toBe("https://cdn.example.com/item.jpg");
  });

  it("preserves data image URLs without rewriting them", () => {
    const dataUrl = "data:image/svg+xml;base64,PHN2Zy8+";

    expect(getImageUrl(dataUrl)).toBe(dataUrl);
    expect(getPrimaryImageUrl([dataUrl])).toBe(dataUrl);
  });

  it("marks known storefront CDN media as proxyable for transforms", () => {
    expect(
      shouldProxyRemoteImageUrl(
        "https://images.unsplash.com/photo-1700000000000?auto=format&fit=crop&w=1200",
      ),
    ).toBe(true);
    expect(
      shouldProxyRemoteImageUrl(
        "https://lh3.googleusercontent.com/aida-public/AB6AXuChero",
      ),
    ).toBe(true);
    expect(shouldProxyRemoteImageUrl("https://cdn.example.com/photo")).toBe(false);
  });

  it("builds optimized upload image URLs for thumbnail surfaces", () => {
    expect(canOptimizeUploadImage("/uploads/products/item.JPG")).toBe(true);
    expect(canOptimizeUploadImage("https://cdn.example.com/item.jpg")).toBe(
      false,
    );

    expect(
      buildOptimizedUploadImageUrl("/uploads/products/item.JPG", {
        width: 320,
        quality: 70,
      }),
    ).toBe("/uploads/products/item.JPG?format=webp&w=320&q=70");

    expect(
      buildOptimizedUploadImageUrl(
        "http://localhost:3007/uploads/products/item.png",
        { width: 96, quality: 68 },
      ),
    ).toBe("http://localhost:3007/uploads/products/item.png?format=webp&w=96&q=68");
  });

  it("builds responsive upload image descriptors", () => {
    expect(
      buildResponsiveUploadImage("/uploads/products/item.jpg", {
        widths: [160, 320],
        fallbackWidth: 320,
        sizes: "45vw",
        quality: 70,
      }),
    ).toEqual({
      src: "/uploads/products/item.jpg?format=webp&w=320&q=70",
      srcSet:
        "/uploads/products/item.jpg?format=webp&w=160&q=70 160w, /uploads/products/item.jpg?format=webp&w=320&q=70 320w",
      sizes: "45vw",
    });
  });
});
