/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/products/new/page.tsx
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  Image as ImageIcon,
  Upload,
  Video as VideoIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { client as sanityClient } from "@/lib/sanity";
import { compressImage, compressVideo } from "@/lib/compress";
import { Btn, Chip, inputCls, labelCls } from "@/components/admin/ui";

const LABELS = [
  ["trending", "Trending"],
  ["new-arrival", "New Arrival"],
  ["best-seller", "Best Seller"],
  ["limited-edition", "Limited Edition"],
  ["sale", "Sale"],
] as const;

const QUALITIES = [
  ["10a", "10A (Premium)"],
  ["7a", "7A"],
] as const;

const DISABLE_REASONS = [
  ["out-of-stock", "Out of Stock"],
  ["seasonal", "Seasonal"],
  ["discontinued", "Discontinued"],
  ["quality-issues", "Quality Issues"],
  ["other", "Other"],
] as const;

const DEFAULT_SIZES = [6, 7, 8, 9, 10];
const MB = 1024 * 1024;
const MAX_VIDEO_MB = 10; // target size AFTER compression
const MAX_INPUT_VIDEO_MB = 300; // largest raw file we'll try to compress

type Media = { file: File; url: string };
type Ref = { _id: string; title: string };

const toList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {hint && (
          <>
            {" "}
            <span className="font-medium text-neutral-400">({hint})</span>
          </>
        )}
      </label>
      {children}
    </div>
  );
}

export default function NewProductPage() {
  const router = useRouter();
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  const [f, setF] = useState({
    orderNumber: 1, // new products go first
    productName: "",
    price: 0,
    description: "",
    madeIn: "",
    stock: 10,
    quality: ["10a"] as string[],
    productLabel: [] as string[],
    disabledSizes: [] as number[],
    offer2Pair: false,
    isDisabled: false,
    disableReason: "",
  });
  const [tags, setTags] = useState("");
  const [colors, setColors] = useState("");

  const [brands, setBrands] = useState<Ref[]>([]);
  const [categories, setCategories] = useState<Ref[]>([]);
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [images, setImages] = useState<Media[]>([]);
  const [video, setVideo] = useState<Media | null>(null);
  const [poster, setPoster] = useState<Media | null>(null);

  const [busy, setBusy] = useState<"images" | "video" | "poster" | "save" | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [videoError, setVideoError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [b, c] = await Promise.all([
          sanityClient.fetch(`*[_type == "brand"] | order(orderNumber asc){ _id, title }`),
          sanityClient.fetch(`*[_type == "category"] | order(orderNumber asc){ _id, title }`),
        ]);
        setBrands(b);
        setCategories(c);
      } catch {
        /* pickers stay empty */
      }
    })();
  }, []);

  const flip = (k: "productLabel" | "disabledSizes" | "quality", v: string | number) =>
    setF((p) => {
      const a = p[k] as (string | number)[];
      return { ...p, [k]: a.includes(v) ? a.filter((x) => x !== v) : [...a, v] };
    });

  const pickImages = async (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files).slice(0, 10);
    setBusy("images");
    setImageError("");
    try {
      const done = await Promise.all(
        picked.map(async (file) => {
          const c = await compressImage(file);
          return { file: c, url: URL.createObjectURL(c) };
        }),
      );
      setImages((prev) => [...prev, ...done]);
    } catch (err) {
      console.error(err);
      setImageError("Couldn't process one or more images");
    } finally {
      setBusy(null);
    }
  };

  const removeImage = (i: number) =>
    setImages((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });

  const pickVideo = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) return setVideoError("Select a video file");
    if (file.size > MAX_INPUT_VIDEO_MB * MB)
      return setVideoError(`Video must be under ${MAX_INPUT_VIDEO_MB}MB`);
    setVideoError("");
    setBusy("video");
    setProgress(0);
    try {
      const c = await compressVideo(file, MAX_VIDEO_MB, setProgress);
      if (c.size > MAX_VIDEO_MB * MB)
        return setVideoError(`Couldn't get under ${MAX_VIDEO_MB}MB. Try a shorter clip.`);
      setVideo({ file: c, url: URL.createObjectURL(c) });
    } catch (err) {
      console.error(err);
      setVideoError("Compression failed. Try another file.");
    } finally {
      setBusy(null);
    }
  };

  const pickPoster = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Select an image");
    setBusy("poster");
    try {
      const c = await compressImage(file, 1280, 0.8);
      setPoster({ file: c, url: URL.createObjectURL(c) });
    } catch {
      toast.error("Couldn't process image");
    } finally {
      setBusy(null);
    }
  };

  const removeVideo = () => {
    setVideo(null);
    setPoster(null);
    setVideoError("");
  };

  const upload = async (kind: "image" | "file", m: Media) =>
    sanityClient.assets.upload(kind, m.file, {
      filename: m.file.name,
      contentType: m.file.type,
    });

  const submit = async () => {
    setError("");
    setImageError("");

    if (images.length === 0) return setImageError("Add at least one image");
    if (!f.productName.trim()) return setError("Product name is required");
    if (!f.price || f.price <= 0) return setError("Price must be greater than 0");
    if (!f.orderNumber || f.orderNumber <= 0)
      return setError("Order number must be greater than 0");

    setBusy("save");
    try {
      const uploadedImages: any[] = [];
      for (let i = 0; i < images.length; i++) {
        setStatus(`Uploading images ${i + 1}/${images.length}`);
        const asset = await upload("image", images[i]).catch(() => {
          throw new Error(`Failed to upload ${images[i].file.name}`);
        });
        uploadedImages.push({
          _type: "image",
          _key: `img-${Date.now()}-${i}`,
          asset: { _type: "reference", _ref: asset._id },
        });
      }

      let uploadedVideo: any = null;
      if (video) {
        setStatus("Uploading video");
        const asset = await upload("file", video).catch(() => {
          throw new Error("Failed to upload video");
        });
        uploadedVideo = { _type: "file", asset: { _type: "reference", _ref: asset._id } };
      }

      let uploadedPoster: any = null;
      if (video && poster) {
        setStatus("Uploading poster");
        const asset = await upload("image", poster).catch(() => {
          throw new Error("Failed to upload poster");
        });
        uploadedPoster = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
      }

      // Shift existing products at or after this position
      setStatus("Saving");
      const toShift: { _id: string; orderNumber: number }[] = await sanityClient.fetch(
        `*[_type == "shoe" && orderNumber >= $n]{ _id, orderNumber }`,
        { n: f.orderNumber },
      );

      const tx = sanityClient.transaction();
      toShift
        .sort((a, b) => b.orderNumber - a.orderNumber)
        .forEach((p) => tx.patch(p._id, { set: { orderNumber: p.orderNumber + 1 } }));

      tx.create({
        _type: "shoe",
        orderNumber: f.orderNumber,
        productName: f.productName.trim(),
        price: f.price,
        description: f.description.trim(),
        madeIn: f.madeIn.trim(),
        stock: f.stock,
        quality: f.quality,
        productLabel: f.productLabel,
        tags: toList(tags),
        colorVariants: toList(colors),
        sizes: DEFAULT_SIZES,
        disabledSizes: f.disabledSizes,
        offer2Pair: f.offer2Pair,
        isDisabled: f.isDisabled,
        ...(f.isDisabled && f.disableReason ? { disableReason: f.disableReason } : {}),
        images: uploadedImages,
        ...(uploadedVideo ? { video: uploadedVideo } : {}),
        ...(uploadedPoster ? { videoPoster: uploadedPoster } : {}),
        ...(brandId ? { brand: { _type: "reference", _ref: brandId } } : {}),
        ...(categoryId ? { category: { _type: "reference", _ref: categoryId } } : {}),
      });

      await tx.commit();
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      console.error("Error creating product:", err);
      const msg: string = err?.message || "";
      setError(
        msg.includes("already exists") || msg.includes("unique")
          ? "Order number conflict. Try a different order number."
          : msg || "Couldn't create product",
      );
      setBusy(null);
      setStatus("");
    }
  };

  const saving = busy === "save";
  const locked = !!busy;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-6">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/admin">
          <Btn icon title="Back">
            <ArrowLeft className="h-4 w-4" />
          </Btn>
        </Link>
        <h1 className="text-3xl font-extrabold leading-none tracking-tight">
          New
          <br />
          product.
        </h1>
      </div>

      {error && (
        <p className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

      <div className="space-y-6">
        {/* Images */}
        <Field label="Images" hint="at least one">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((m, i) => (
              <div key={m.url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={`Preview ${i + 1}`}
                  className="aspect-square w-full rounded-2xl bg-neutral-100 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  disabled={locked}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-neutral-900 p-1 text-white shadow"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={locked}
              onClick={() => imgInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-neutral-200 text-neutral-400 transition hover:border-blue-500 hover:text-blue-600 disabled:opacity-50"
            >
              {busy === "images" ? (
                <span className="text-xs font-semibold">Optimizing…</span>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  <span className="text-xs font-semibold">Add</span>
                </>
              )}
            </button>
          </div>
          {imageError && <p className="mt-2 text-xs font-semibold text-red-500">{imageError}</p>}
          <input
            ref={imgInputRef}
            type="file"
            multiple
            accept="image/*"
            hidden
            onChange={(e) => {
              pickImages(e.target.files);
              e.target.value = "";
            }}
          />
        </Field>

        {/* Core */}
        <Field label="Product name">
          <input
            className={inputCls}
            value={f.productName}
            onChange={(e) => setF({ ...f, productName: e.target.value })}
          />
        </Field>

        <Field label="Price (₹)" hint="1 pair">
          <input
            type="number"
            step="0.01"
            min={0}
            inputMode="decimal"
            className={inputCls}
            value={f.price || ""}
            onChange={(e) => setF({ ...f, price: parseFloat(e.target.value) || 0 })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
          </Field>
          <Field label="Brand">
            <select className={inputCls} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">None</option>
              {brands.map((b) => (
                <option key={b._id} value={b._id}>{b.title}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Offer">
          <Chip active={f.offer2Pair} onClick={() => setF((p) => ({ ...p, offer2Pair: !p.offer2Pair }))}>
            2 pair offer
          </Chip>
        </Field>

        <Field label="Label">
          <div className="flex flex-wrap gap-2">
            {LABELS.map(([v, t]) => (
              <Chip key={v} active={f.productLabel.includes(v)} onClick={() => flip("productLabel", v)}>
                {t}
              </Chip>
            ))}
          </div>
        </Field>

        {/* Optional. Collapsed. */}
        <details className="group rounded-3xl border border-neutral-200 p-4 open:space-y-6">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold">
            More details
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>

          <Field label="Order number" hint="1 = first">
            <input
              type="number"
              min={1}
              className={inputCls}
              value={f.orderNumber || ""}
              onChange={(e) => setF({ ...f, orderNumber: parseInt(e.target.value) || 0 })}
            />
          </Field>

          <Field label="Description">
            <textarea
              rows={3}
              className={inputCls}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Country of origin">
              <input className={inputCls} value={f.madeIn} onChange={(e) => setF({ ...f, madeIn: e.target.value })} />
            </Field>
            <Field label="Stock">
              <input
                type="number"
                min={0}
                className={inputCls}
                value={f.stock}
                onChange={(e) => setF({ ...f, stock: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>

          <Field label="Quality">
            <div className="flex flex-wrap gap-2">
              {QUALITIES.map(([v, t]) => (
                <Chip key={v} active={f.quality.includes(v)} onClick={() => flip("quality", v)}>
                  {t}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Tags" hint="comma separated">
            <input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>

          <Field label="Colors" hint="comma separated">
            <input className={inputCls} value={colors} onChange={(e) => setColors(e.target.value)} />
          </Field>

          <Field label="Sizes" hint="tap to disable">
            <div className="flex flex-wrap gap-2">
              {DEFAULT_SIZES.map((s) => (
                <Chip key={s} danger active={f.disabledSizes.includes(s)} onClick={() => flip("disabledSizes", s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </Field>

          {/* Video */}
          <Field label="Video">
            {busy === "video" ? (
              <div className="rounded-3xl bg-neutral-100 p-5 text-center">
                <p className="text-sm font-semibold">Compressing… {progress}%</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-medium text-neutral-400">
                  Runs in your browser. Keep this tab open.
                </p>
              </div>
            ) : (
              video && (
                <div className="relative">
                  <video
                    key={video.url}
                    src={video.url}
                    poster={poster?.url}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    className="aspect-video w-full rounded-3xl bg-neutral-100 object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeVideo}
                    disabled={locked}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-neutral-900 p-1 text-white shadow"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            )}
            {videoError && <p className="mt-2 text-xs font-semibold text-red-500">{videoError}</p>}

            <div className="mt-3 flex flex-wrap gap-2">
              <Btn className="flex-1" disabled={locked} onClick={() => vidInputRef.current?.click()}>
                <VideoIcon className="h-4 w-4" />
                {video ? "Change video" : "Upload video"}
              </Btn>
              {video && busy !== "video" && (
                <Btn
                  className="flex-1"
                  disabled={locked}
                  loading={busy === "poster"}
                  onClick={() => posterInputRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4" />
                  {poster ? "Change poster" : "Poster"}
                </Btn>
              )}
            </div>
            <p className="mt-2 text-xs font-medium text-neutral-400">
              Up to {MAX_INPUT_VIDEO_MB}MB. Auto-compressed to under {MAX_VIDEO_MB}MB.
              {video ? ` ${(video.file.size / MB).toFixed(1)}MB ready.` : ""}
            </p>
            <input
              ref={vidInputRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => {
                pickVideo(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <input
              ref={posterInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                pickPoster(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </Field>

          <Field label="Visibility">
            <Chip danger active={f.isDisabled} onClick={() => setF((p) => ({ ...p, isDisabled: !p.isDisabled }))}>
              Hide from website
            </Chip>
            {f.isDisabled && (
              <div className="mt-3 flex flex-wrap gap-2">
                {DISABLE_REASONS.map(([v, t]) => (
                  <Chip key={v} active={f.disableReason === v} onClick={() => setF({ ...f, disableReason: v })}>
                    {t}
                  </Chip>
                ))}
              </div>
            )}
          </Field>
        </details>
      </div>

      {/* Footer */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <p className="truncate text-xs font-semibold text-neutral-400">
            {saving ? `${status}…` : ""}
          </p>
          <div className="flex gap-2">
            <Link href="/admin">
              <Btn disabled={saving}>Cancel</Btn>
            </Link>
            <Btn variant="primary" onClick={submit} loading={saving} disabled={locked}>
              Create product
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}