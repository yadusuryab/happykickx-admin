// app/admin/brands/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { client } from "@/lib/sanity";
import { undoable, useDebounced, usePaged, useQuery } from "@/lib/admin-data";
import {
  Btn,
  Empty,
  PER_PAGE,
  PageHead,
  Pager,
  Row,
  SearchInput,
  Select,
  Skeleton,
  Tag,
  Thumb,
} from "@/components/admin/ui";
import { QUERY, type Brand } from "../../../lib/brand-shared";

const BrandEdit = dynamic(
  () => import("./brand-edit"),
  { ssr: false },
);

// "new" opens the create form. A string id opens edit. null is closed.
type Open = "new" | string | null;

export default function BrandsPage() {
  const { data, error, refetch, mutate } = useQuery<Brand[]>("brands", QUERY);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [open, setOpen] = useState<Open>(null);
  const q = useDebounced(search).trim().toLowerCase();

  const filtered = useMemo(
    () =>
      (data ?? []).filter(
        (c) => !q || `${c.title} ${c.slug} ${c.orderNumber}`.toLowerCase().includes(q),
      ),
    [data, q],
  );
  const { rows, page, pages, setPage } = usePaged(filtered, perPage, `${q}|${perPage}`);
  const editing = open && open !== "new" ? data?.find((c) => c._id === open) : null;

  const remove = (c: Brand) =>
    undoable(
      c._id,
      `Deleted “${c.title}”`,
      () => mutate((d) => d.filter((x) => x._id !== c._id)),
      () => mutate((d) => [...d, c].sort((a, b) => a.orderNumber - b.orderNumber)),
      () => client.delete(c._id),
    );

  return (
    <>
      <PageHead count={data && `${data.length} brands`} title="Brands.">
        <Btn variant="primary" className="h-12" onClick={() => setOpen("new")}>
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">Add brand</span>
        </Btn>
      </PageHead>

      <div className="mt-6 flex flex-col gap-3 sm:mt-8">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search brand or slug…"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-neutral-500">
            {filtered.length} of {data?.length ?? 0}
          </p>
          <Select label="Per page" value={perPage} onChange={setPerPage} options={PER_PAGE} />
        </div>
      </div>

      <div className="mt-5 space-y-2 sm:mt-6">
        {!data && !error && <Skeleton />}
        {!data && error && (
          <Empty text="Couldn't load brands." action="Retry" onAction={refetch} />
        )}

        {rows.map((c) => (
          <Row key={c._id} onClick={() => setOpen(c._id)}>
            <Thumb src={c.img} className="h-16 w-16 sm:h-14 sm:w-14" />

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-400">
                #{c.orderNumber}
              </p>
              <p className="truncate font-extrabold tracking-tight">{c.title}</p>
              <div className="mt-1">
                <Tag>/{c.slug}</Tag>
              </div>
            </div>

            <div
              className="flex w-full items-center justify-end gap-2 border-t border-neutral-200 pt-3 sm:ml-auto sm:w-auto sm:border-0 sm:pt-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Btn icon title="Edit" onClick={() => setOpen(c._id)}>
                <Pencil className="h-4 w-4" />
              </Btn>
              <Btn icon variant="danger" title="Delete" onClick={() => remove(c)}>
                <Trash2 className="h-4 w-4" />
              </Btn>
            </div>
          </Row>
        ))}

        {data && !rows.length && (
          <Empty
            text={search ? "No brands found." : "No brands yet."}
            action={search ? undefined : "Add brand"}
            onAction={search ? () => setSearch("") : () => setOpen("new")}
          />
        )}
      </div>

      <Pager page={page} pages={pages} onPage={setPage} />

      {data && (open === "new" || editing) && (
        <BrandEdit
          key={editing?._id ?? "new"}
          brand={editing ?? null}
          brands={data}
          onClose={() => setOpen(null)}
          onSaved={(next) => {
            mutate(() => next);
            refetch(); // picks up the new image URLs
          }}
        />
      )}
    </>
  );
}