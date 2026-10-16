import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type React from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AdminRoute } from "@/components/admin-route";
import { exportarCsvAdmin, listarTodosAdmin, perfilComparativoAdmin } from "@/lib/api/admin.server";
import { GraficoPerfil } from "@/components/grafico-perfil";
import { nomeVirtude } from "@/lib/virtues-list";
import { slugParaNomeEmocao } from "@/lib/emotions-list";
import { slugParaNomeSintoma } from "@/lib/symptoms-list";
import { formatarDataPtBr, truncarTexto, truncarUserId } from "@/lib/format";
import { parseEmocoes, parseSintomas } from "@/lib/parse-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const { user } = useAuth();
  const [filtroDe, setFiltroDe] = useState("");
  const [filtroAte, setFiltroAte] = useState("");
  const [filtrosAtivos, setFiltrosAtivos] = useState<{ de: string; ate: string }>({
    de: "",
    ate: "",
  });
  const [exportando, setExportando] = useState(false);
  const [usuarioPerfil, setUsuarioPerfil] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-registros", user?.id, filtrosAtivos.de, filtrosAtivos.ate],
    queryFn: async () =>
      listarTodosAdmin({
        data: {
          de: filtrosAtivos.de || undefined,
          ate: filtrosAtivos.ate || undefined,
        },
      }),
    enabled: !!user,
  });

  const { data: perfil, isLoading: perfilCarregando } = useQuery({
    queryKey: ["perfil-comparativo", user?.id, usuarioPerfil],
    queryFn: async () =>
      perfilComparativoAdmin({
        data: { userId: usuarioPerfil || null },
      }),
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
    setExportando(true);
    try {
      const result = await exportarCsvAdmin({
        data: {
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Perfil de emoções — usuário vs grupo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {perfilCarregando ? (
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : perfil && perfil.ok ? (
            <>
              <div className="max-w-xs">
                <Label>Selecione o usuário</Label>
                <Select
                  value={usuarioPerfil || perfil.usuarioSelecionado || ""}
                  onValueChange={setUsuarioPerfil}
                >
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue placeholder="Selecione o usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {perfil.usuarios.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {perfil.usuarios.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum registro disponível para gerar o perfil.
                </p>
              ) : (
                <GraficoPerfil
                  rotulos={perfil.rotulos}
                  usuario={perfil.usuario}
                  grupo={perfil.grupo}
                  nomeUsuario={
                    perfil.usuarios.find(
                      (u) => u.user_id === (usuarioPerfil || perfil.usuarioSelecionado),
                    )?.nome ?? "Usuário"
                  }
                />
              )}
            </>
          ) : (
            <p className="text-sm text-red-500">
              {perfil?.erro ?? "Não foi possível carregar o perfil."}
            </p>
          )}
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
                    className="whitespace-nowrap font-medium text-foreground"
                    title={registro.user_email ?? registro.user_id}
                  >
                    {registro.user_name ?? registro.user_email ?? truncarUserId(registro.user_id)}
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
