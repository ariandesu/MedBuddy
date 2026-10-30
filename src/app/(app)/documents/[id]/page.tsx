import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLocaleAndDict } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function DocumentReviewPage() {
  const { dict } = await getLocaleAndDict();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{dict.review.title}</h1>
      <Tabs defaultValue="extracted" className="md:hidden">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="original">{dict.review.original}</TabsTrigger>
          <TabsTrigger value="extracted">{dict.review.extracted}</TabsTrigger>
        </TabsList>
        <TabsContent value="original">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">M1 placeholder.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="extracted">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">M1 placeholder.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="hidden gap-6 md:grid md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{dict.review.original}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">M1 placeholder.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{dict.review.extracted}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">M1 placeholder.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
