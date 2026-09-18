import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FormRenderer from "@/components/FormRenderer";

export const dynamic = "force-dynamic";

export default async function PublicFormPage({ params }: { params: { slug: string } }) {
  const form = await prisma.formDefinition.findUnique({ where: { slug: params.slug } });
  if (!form || form.status !== "active") notFound();

  const title = (form.title as any) || { zh: form.name };
  const desc = (form.description as any) || undefined;

  return (
    <div className="min-h-[60vh] bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
          <h1 className="text-2xl font-semibold text-gray-900 text-left">{title.zh || form.name}</h1>
          {desc?.zh && <p className="text-sm text-gray-500 mt-2 text-left whitespace-pre-wrap">{desc.zh}</p>}
          <div className="mt-6">
            <FormRenderer form={form as any} />
          </div>
        </div>
      </div>
    </div>
  );
}
