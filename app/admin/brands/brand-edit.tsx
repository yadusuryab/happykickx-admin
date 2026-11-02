"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { client } from "@/lib/sanity";
import { compressImage } from "@/lib/compress";
import {
  Btn,
  Modal,
  ModalBody,
  ModalFoot,
  ModalHead,
  Thumb,
  inputCls,
  labelCls,
} from "@/components/admin/ui";
import { slugify, type Brand } from "../../../lib/brand-shared";

type Media = { file: File; url: string };

// brand === null means "create".
export default function BrandEdit({
  brand,
  brands,
  onSaved,
  onClose,
}: {
  brand: Brand | null;
  brands: Brand[];
  onSaved: (next: Brand[]) => void;
  onClose: () => void;
}) {
  const isNew = !brand;
  const total = brands.length + (isNew ? 1 : 0);
  const [title, setTitle] = useState(brand?.title ?? "");
  const [slug, setSlug] = useState(brand?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [order, setOrder] = useState(brand?.orderNumber ?? total);
  const [img, setImg] = useState<Media | null>(null);
  const [busy, setBusy] = useState<"image" | "save" | null>(null);
  const [err, setErr] = useState("");
  const imgRef = useRef<HTMLInputElement>(null);

  const pickImage = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Select an image");
    setBusy("image");
    try {
      const c = await compressImage(file);
      setImg({ file: c, url: URL.createObjectURL(c) });
    } catch {
      toast.error("Couldn't process image");
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    const t = title.trim();
    const s = slugify(slug);
    if (!t) return setErr("Title is required");
    if (!s) return setErr("Slug is required");
    if (brands.some((c) => c.slug === s && c._id !== brand?._id))
      return setErr("Slug is already used");
    setErr("");
    setBusy("save");

    try {
      const pos = Math.max(1, Math.min(order, total));

      let imageField: any;
      let imgUrl = brand?.img;
      if (img) {
        const asset = await client.assets.upload("image", img.file, {
          filename: img.file.name,
        });
        imageField = {
          _type: "image",
          asset: { _type: "reference", _ref: asset._id },
        };
        imgUrl = asset.url;
      }

      const base = {
        title: t,
        slug: { _type: "slug", current: s },
        ...(imageField ? { logo: imageField } : {}),
      };

      const tx = client.transaction();
      let id = brand?._id ?? "";
      if (isNew) {
        id = `brand-${s}-${Date.now().toString(36)}`;
        tx.create({ _id: id, _type: "brand", ...base, orderNumber: pos });
      } else {
        tx.patch(id, (p) => p.set({ ...base, orderNumber: pos }));
      }

      const me: Brand = {
        _id: id,
        title: t,
        slug: s,
        img: imgUrl,
        orderNumber: pos,
      };
      const list = brands.filter((c) => c._id !== id);
      list.splice(pos - 1, 0, me);
      const next = list.map((c, i) => ({ ...c, orderNumber: i + 1 }));

      for (const c of next) {
        const old = brands.find((o) => o._id === c._id);
        if (c._id !== id && old && old.orderNumber !== c.orderNumber)
          tx.patch(c._id, (p) => p.set({ orderNumber: c.orderNumber }));
      }
      await tx.commit();

      toast.success(isNew ? "Brand added" : "Brand saved");
      onSaved(next);
      onClose();
    } catch (e) {
      toast.error((e as Error).message || "Couldn't save");
      setBusy(null);
    }
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead
        title={isNew ? <>New<br />brand.</> : <>Edit<br />brand.</>}
        onClose={onClose}
      />
      <ModalBody>
        <div>
          <label className={labelCls}>Logo</label>
          <div className="flex items-center gap-4">
            <Thumb src={img?.url ?? brand?.img} className="h-24 w-24" />
            <div>
              <Btn onClick={() => imgRef.current?.click()} loading={busy === "image"}>
                <Upload className="h-4 w-4" />
                {img || brand?.img ? "Replace" : "Upload"}
              </Btn>
              <p className="mt-2 text-xs font-medium text-neutral-400">
                Any size. Auto-compressed.
              </p>
            </div>
          </div>
          <input
            ref={imgRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              pickImage(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <div>
          <label className={labelCls}>Brand name</label>
          <input
            className={inputCls}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </div>

        <div>
          <label className={labelCls}>Slug</label>
          <input
            className={inputCls}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            onBlur={() => setSlug((v) => slugify(v))}
          />
        </div>

        <div>
          <label className={labelCls}>Display order</label>
          <input
            type="number"
            min={1}
            max={total}
            className={inputCls}
            value={order}
            onChange={(e) => setOrder(Number(e.target.value) || 1)}
          />
          {order !== brand?.orderNumber && (
            <p className="mt-2 text-xs font-semibold text-amber-600">
              Others will shift. Max {total}.
            </p>
          )}
        </div>

        {err && <p className="text-xs font-semibold text-red-500">{err}</p>}
      </ModalBody>
      <ModalFoot>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn
          variant="primary"
          onClick={save}
          loading={busy === "save"}
          disabled={!!busy}
        >
          {isNew ? "Add brand" : "Save changes"}
        </Btn>
      </ModalFoot>
    </Modal>
  );
}