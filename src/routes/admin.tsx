import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type React from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AdminRoute } from "@/components/admin-route";
import { exportarCsvAdmin, listarTodosAdmin } from "@/lib/api/admin.server";
import { nomeVirtude } from "@/lib/virtues-list";
import { slugParaNomeEmocao } from "@/lib/emotions-list";
import { slugParaNomeSintoma } from "@/lib/symptoms-list";
import { formatarDataPtBr, truncarTexto, truncarUserId } from "@/lib/format";
import { parseEmocoes, parseSintomas } from "@/lib/parse-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Painel admin — Agenda de Virtudes" }],
  }),
  component: AdminPage,
});

function PainelAdminConteudo() {
  const { getToken, user } = useAuth();
  const [filtroDe, setFiltroDe] = useState("");
  const [filtroAte, setFiltroAte] = useState("");
  const [filtrosAtivos, setFiltrosAtivos] = useState<{ de: string; ate: string }>({
    de: "",
    ate: "",
  });
  const [exportando, setExportando] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-registros", user?.id, filtrosAtivos.de, filtrosAtivos.ate],
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        return { ok: false as const, erro: "Não autenticado." };
      }
      return listarTodosAdmin({
        data: {
          token,
          de: filtrosAtivos.de || undefined,
          ate: filtrosAtivos.ate || undefined,
        },
      });
    },
    enabled: !!user,
  });

  function handleFiltrar(e: React.FormEvent) {
    e.preventDefault();
    setFiltrosAtivos({ de: filtroDe, ate: filtroAte });
  }

  function handleLimparFiltros() {
    setFiltroDe("");
    setFiltroAte("");
    setFiltrosAtivos({ de: "", ate: "" });
  }

  async function handleExportarCsv() {
    const token = await getToken();
    if (!token) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    setExportando(true);
    try {
      const result = await exportarCsvAdmin({
        data: {
          token,
          de: filtrosAtivos.de || undefined,
          ate: filtrosAtivos.ate || undefined,
        },
      });

      if (!result.ok) {
        toast.error(result.erro ?? "Erro ao exportar CSV.");
        return;
      }

      const blob = new Blob(["\uFEFF" + result.csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `registros_virtudes_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("CSV exportado com sucesso!");
    } catch {
      toast.error("Erro inesperado ao exportar CSV.");
    } finally {
      setExportando(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data && !data.ok) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 text-center text-red-500">
        <p>{data.erro}</p>
      </div>
    );
  }

  const registros = data?.ok ? data.registros : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Painel administrativo</h1>
          <p className="text-sm text-muted-foreground">
            Visualização e exportação de todos os registros de virtudes realizadas.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={handleExportarCsv} disabled={exportando}>
          {exportando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Exportar CSV
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleFiltrar} className="flex flex-wrap items-end gap-4">
            <div className="min-w-[150px] flex-1 space-y-2">
              <Label htmlFor="filtro-de">De</Label>
              <Input
                id="filtro-de"
                type="date"
                value={filtroDe}
                onChange={(e) => setFiltroDe(e.target.value)}
              />
            </div>
            <div className="min-w-[150px] flex-1 space-y-2">
              <Label htmlFor="filtro-ate">Até</Label>
              <Input
                id="filtro-ate"
                type="date"
                value={filtroAte}
                onChange={(e) => setFiltroAte(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit">Filtrar</Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleLimparFiltros}
                disabled={!filtroDe && !filtroAte && !filtrosAtivos.de && !filtrosAtivos.ate}
              >
                Limpar filtros
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {registros.length} registro(s) encontrado(s)
        </p>
      </div>

      {registros.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <p className="text-base">Nenhum registro encontrado para o período selecionado.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data da prática</TableHead>
                <TableHead>Virtude</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead>Emoção</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Usuário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros.map((registro) => (
                <TableRow key={registro.id}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {formatarDataPtBr(registro.data_registro)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium">
                    {nomeVirtude(registro.virtude)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={registro.modalidade === "grupo" ? "secondary" : "outline"}>
                      {registro.modalidade === "grupo" ? "Em grupo" : "Individual"}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {parseEmocoes(registro.emocao_atual).map((slug) => (
                        <Badge key={slug} variant="secondary" className="text-xs">
                          {slugParaNomeEmocao(slug)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs sm:max-w-md" title={registro.descricao_acoes}>
                    {truncarTexto(registro.descricao_acoes, 80)}
                  </TableCell>
                  <TableCell
                    className="whitespace-nowrap font-mono text-xs text-muted-foreground"
                    title={registro.user_id}
                  >
                    {truncarUserId(registro.user_id)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function AdminPage() {
  return (
    <AdminRoute>
      <PainelAdminConteudo />
    </AdminRoute>
  );
}
