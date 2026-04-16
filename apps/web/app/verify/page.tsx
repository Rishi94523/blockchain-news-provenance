import { verifyArticleByIdOrSlug } from "@/lib/articles";
import { prisma } from "@/lib/prisma";
import { VerifyClient } from "@/components/verify-client";

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  searchParams
}: {
  searchParams: Promise<{ article?: string }>;
}) {
  const params = await searchParams;
  const latest = await prisma.article.findMany({
    where: {
      status: "PUBLISHED"
    },
    orderBy: {
      publishedAt: "desc"
    },
    take: 3
  });
  type VerifyArticle = (typeof latest)[number];

  const initialResults = await Promise.all(
    latest.map((article: VerifyArticle) => verifyArticleByIdOrSlug(article.slug))
  );

  return (
    <VerifyClient
      initialResults={
        params.article
          ? [await verifyArticleByIdOrSlug(params.article), ...initialResults]
          : initialResults
      }
    />
  );
}
