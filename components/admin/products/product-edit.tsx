"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Image as ImageIcon, Trash2, Upload, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { client } from "@/lib/sanity";
import { useQuery } from "@/lib/admin-data";
import { compressImage, compressVideo } from "@/lib/compress";
import {
  Btn,
  Chip,
  Modal,
  ModalBody,
  ModalFoot,
  ModalHead,
  Thumb,
  inputCls,
  labelCls,
} from "@/components/admin/ui";
import { DEFAULT_SIZES, DISABLE_REASONS, LABELS, QUALITIES, type Shoe } from "./shared";
import { QUERY as CATEGORY_QUERY, type Category } from "@/lib/cat-shared";
import { QUERY as BRAND_QUERY, type Brand } from "@/lib/brand-shared";

const MB = 1024 * 1024;
const MAX_VIDEO_MB = 300;
const TARGET_MB = 4; // Vercel body limit is ~4.5MB

type Media = { file: File; url: string };

async function send(url: string, method: string, body?: FormData) {
  const res = await fetch(url, { method, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const toList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export default function ProductEdit({
  shoe,
  shoes,
  onSaved,
  onClose,
}: {
  shoe: Shoe;
  shoes: Shoe[];
  onSaved: (next: Shoe[]) => void;
  onClose: () => void;
}) {
  const total = shoes.length;
  const { data: categories } = useQuery<Category[]>("categories", CATEGORY_QUERY);
  const { data: brands } = useQuery<Brand[]>("brands", BRAND_QUERY);

  const [f, setF] = useState({
    productName: shoe.productName,
    price: shoe.price,
    orderNumber: shoe.orderNumber,
    productLabel: shoe.productLabel ?? [],
    disabledSizes: shoe.disabledSizes ?? [],
    quality: shoe.quality ?? ["10a"],
    description: shoe.description ?? "",
    madeIn: shoe.madeIn ?? "",
    offer2Pair: shoe.offer2Pair ?? false,
    stock: shoe.stock ?? 0,
    isDisabled: shoe.isDisabled ?? false,
    disableReason: shoe.disableReason ?? "",
  });
  // Brand + category are references. Load the current ones once.
  const [refs, setRefs] = useState<{ category: string; brand: string } | null>(null);
  useEffect(() => {
    client
      .fetch(`*[_id == $id][0]{ "category": category._ref, "brand": brand._ref }`, { id: shoe._id })
      .then((r) => setRefs({ category: r?.category ?? "", brand: r?.brand ?? "" }))
      .catch(() => setRefs({ category: "", brand: "" }));
  }, [shoe._id]);

  const [tags, setTags] = useState((shoe.tags ?? []).join(", "));
  const [colors, setColors] = useState((shoe.colorVariants ?? []).join(", "));
  const [img, setImg] = useState<Media | null>(null);
  const [vid, setVid] = useState<Media | null>(null);
  const [poster, setPoster] = useState<Media | null>(null);
  const [busy, setBusy] = useState<"image" | "video" | "save" | null>(null);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLInputElement>(null);

  const flip = (k: "productLabel" | "disabledSizes" | "quality", v: string | number) =>
    setF((p) => {
      const a = p[k] as (string | number)[];
      return { ...p, [k]: a.includes(v) ? a.filter((x) => x !== v) : [...a, v] };
    });

  const pickImage = async (
    file: File | undefined,
    set: (m: Media) => void,
    max?: number,
    quality?: number,
  ) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Select an image");
    setBusy("image");
    try {
      const c = await compressImage(file, max, quality);
      set({ file: c, url: URL.createObjectURL(c) });
    } catch {
      toast.error("Couldn't process image");
    } finally {
      setBusy(null);
    }
  };

  const pickVideo = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) return setErr("Select a video file");
    if (file.size > MAX_VIDEO_MB * MB) return setErr(`Video must be under ${MAX_VIDEO_MB}MB`);
    setErr("");
    setBusy("video");
    setProgress(0);
    try {
      const c = await compressVideo(file, TARGET_MB, setProgress);
      if (c.size > TARGET_MB * MB)
        return setErr(`Couldn't get under ${TARGET_MB}MB. Try a shorter clip.`);
      setVid({ file: c, url: URL.createObjectURL(c) });
    } catch {
      setErr("Compression failed. Try another file.");
    } finally {
      setBusy(null);
    }
  };

  const removeVideo = async () => {
    if (!confirm("Remove this video?")) return;
    try {
      await send(`/api/products/${shoe._id}/video`, "DELETE");
      onSaved(
        shoes.map((s) =>
          s._id === shoe._id ? { ...s, videoUrl: undefined, posterUrl: undefined } : s,
        ),
      );
      setVid(null);
      setPoster(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const save = async () => {
    if (!refs) return;
    setBusy("save");
    try {
      const order = Math.max(1, Math.min(f.orderNumber, total));

      // Media uploads run in parallel.
      const jobs: Promise<unknown>[] = [];
      if (img) {
        const fd = new FormData();
        fd.append("image", img.file);
        jobs.push(send(`/api/products/${shoe._id}/image`, "PUT", fd));
      }
      if (vid || poster) {
        const fd = new FormData();
        if (vid) fd.append("video", vid.file);
        if (poster) fd.append("poster", poster.file);
        jobs.push(send(`/api/products/${shoe._id}/video`, "PUT", fd));
      }
      await Promise.all(jobs);

      const { disableReason, ...rest } = f;
      const fields = {
        ...rest,
        orderNumber: order,
        tags: toList(tags),
        colorVariants: toList(colors),
        ...(f.isDisabled && disableReason ? { disableReason } : {}),
        ...(refs.category ? { category: { _type: "reference", _ref: refs.category } } : {}),
        ...(refs.brand ? { brand: { _type: "reference", _ref: refs.brand } } : {}),
      };
      const unset = [
        ...(f.isDisabled && disableReason ? [] : ["disableReason"]),
        ...(refs.category ? [] : ["category"]),
        ...(refs.brand ? [] : ["brand"]),
      ];

      // Re-number locally. No extra fetch. One transaction writes everything.
      const list = shoes.filter((s) => s._id !== shoe._id);
      list.splice(order - 1, 0, { ...shoe, ...rest, orderNumber: order, tags: toList(tags), colorVariants: toList(colors) });
      const next = list.map((s, i) => ({ ...s, orderNumber: i + 1 }));

      const tx = client.transaction();
      tx.patch(shoe._id, (p) => p.set(fields).unset(unset));
      for (const s of next) {
        const old = shoes.find((o) => o._id === s._id);
        if (s._id !== shoe._id && old && old.orderNumber !== s.orderNumber)
          tx.patch(s._id, (p) => p.set({ orderNumber: s.orderNumber }));
      }
      await tx.commit();

      onSaved(next);
      onClose();
    } catch (e) {
      toast.error((e as Error).message || "Couldn't save");
      setBusy(null);
    }
  };

  const vsrc = vid?.url ?? shoe.videoUrl;

  return (
    <Modal onClose={onClose}>
      <ModalHead title={<>Edit<br />product.</>} onClose={onClose} />
      <ModalBody>
        {/* Image + name + price */}
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <Thumb src={img?.url ?? shoe.img} className="h-24 w-24" />
            <Btn className="mt-2 w-24" onClick={() => imgRef.current?.click()} loading={busy === "image"}>
              <Upload className="h-4 w-4" />
            </Btn>
            <input
              ref={imgRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                pickImage(e.target.files?.[0], setImg);
                e.target.value = "";
              }}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <label className={labelCls}>Name</label>
              <input
                className={inputCls}
                value={f.productName}
                onChange={(e) => setF({ ...f, productName: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Price (₹)</label>
              <input
                type="number"
                step="0.01"
                className={inputCls}
                value={f.price}
                onChange={(e) => setF({ ...f, price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Category</label>
            <select
              className={inputCls}
              value={refs?.category ?? ""}
              disabled={!refs}
              onChange={(e) => refs && setRefs({ ...refs, category: e.target.value })}
            >
              <option value="">None</option>
              {categories?.map((c) => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Brand</label>
            <select
              className={inputCls}
              value={refs?.brand ?? ""}
              disabled={!refs}
              onChange={(e) => refs && setRefs({ ...refs, brand: e.target.value })}
            >
              <option value="">None</option>
              {brands?.map((b) => (
                <option key={b._id} value={b._id}>{b.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Label</label>
          <div className="flex flex-wrap gap-2">
            {LABELS.map(([v, t]: any) => (
              <Chip key={v} active={f.productLabel.includes(v)} onClick={() => flip("productLabel", v)}>
                {t}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>
            Sizes <span className="font-medium text-neutral-400">(tap to disable)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {(shoe.sizes?.length ? shoe.sizes : DEFAULT_SIZES).map((s) => (
              <Chip key={s} danger active={f.disabledSizes.includes(s)} onClick={() => flip("disabledSizes", s)}>
                {s}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Offer</label>
          <div className="flex flex-wrap gap-2">
            <Chip active={f.offer2Pair} onClick={() => setF((p) => ({ ...p, offer2Pair: !p.offer2Pair }))}>
              2 pair offer
            </Chip>
          </div>
        </div>

        <div>
          <label className={labelCls}>Visibility</label>
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
        </div>

        {/* Rarely changed. Collapsed by default. */}
        <details className="group rounded-3xl border border-neutral-200 p-4 open:space-y-4">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold">
            More details
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>

          <div>
            <label className={labelCls}>Order number</label>
            <input
              type="number"
              min={1}
              max={total}
              className={inputCls}
              value={f.orderNumber}
              onChange={(e) => setF({ ...f, orderNumber: Number(e.target.value) || 1 })}
            />
            {f.orderNumber !== shoe.orderNumber && (
              <p className="mt-2 text-xs font-semibold text-amber-600">Others will shift. Max {total}.</p>
            )}
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              rows={3}
              className={inputCls}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Country of origin</label>
              <input className={inputCls} value={f.madeIn} onChange={(e) => setF({ ...f, madeIn: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Stock</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={f.stock}
                onChange={(e) => setF({ ...f, stock: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Quality</label>
            <div className="flex flex-wrap gap-2">
              {QUALITIES.map(([v, t]) => (
                <Chip key={v} active={f.quality.includes(v)} onClick={() => flip("quality", v)}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>
              Tags <span className="font-medium text-neutral-400">(comma separated)</span>
            </label>
            <input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>
              Colors <span className="font-medium text-neutral-400">(comma separated)</span>
            </label>
            <input className={inputCls} value={colors} onChange={(e) => setColors(e.target.value)} />
          </div>

          {/* Video */}
          <div>
            <label className={labelCls}>Video</label>
            {busy === "video" ? (
              <div className="mb-3 rounded-3xl bg-neutral-100 p-5 text-center">
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
              vsrc && (
                <video
                  key={vsrc}
                  src={vsrc}
                  poster={poster?.url ?? shoe.posterUrl}
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  className="mb-3 aspect-video w-full rounded-3xl bg-neutral-100 object-cover"
                />
              )
            )}
            {err && <p className="mb-2 text-xs font-semibold text-red-500">{err}</p>}

            <div className="flex flex-wrap gap-2">
              <Btn className="flex-1" disabled={busy === "video"} onClick={() => vidRef.current?.click()}>
                <VideoIcon className="h-4 w-4" />
                {vid ? "Change video" : shoe.videoUrl ? "Replace video" : "Upload video"}
              </Btn>
              {vsrc && busy !== "video" && (
                <Btn className="flex-1" onClick={() => posterRef.current?.click()}>
                  <ImageIcon className="h-4 w-4" />
                  {poster ? "Change poster" : "Poster"}
                </Btn>
              )}
              {shoe.videoUrl && (
                <Btn icon variant="danger" title="Remove video" onClick={removeVideo}>
                  <Trash2 className="h-4 w-4" />
                </Btn>
              )}
            </div>
            {(vid || poster) && (
              <p className="mt-2 text-center text-xs font-semibold text-blue-700">
                {vid ? `${(vid.file.size / MB).toFixed(1)}MB ready. ` : ""}Saved with “Save changes”.
              </p>
            )}
            <input
              ref={vidRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => {
                pickVideo(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <input
              ref={posterRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                pickImage(e.target.files?.[0], setPoster, 1280, 0.8);
                e.target.value = "";
              }}
            />
          </div>
        </details>
      </ModalBody>
      <ModalFoot>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} loading={busy === "save"} disabled={!!busy || !refs}>
          Save changes
        </Btn>
      </ModalFoot>
    </Modal>
  );
}