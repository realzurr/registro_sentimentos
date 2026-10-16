import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/protected-route";
import { JANELA_EDICAO_MS } from "@/lib/constants";
import {
  meusRegistros,
  atualizarRegistro,
  excluirRegistro,
  registroSchema,
} from "@/lib/api/registros.server";
import { embaralharVirtudes, nomeVirtude } from "@/lib/virtues-list";
import { slugParaNomeEmocao } from "@/lib/emotions-list";
import { formatarDataPtBr } from "@/lib/format";
import { paraInputDatetimeLocal } from "@/lib/date";
import type { RegistroVirtude } from "@/lib/db.server";
import { parseEmocoes, parseSintomas } from "@/lib/parse-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmotionCheckboxGroup } from "@/components/emotion-checkbox-group";
import { SymptomCheckboxGroup } from "@/components/symptom-checkbox-group";
import { slugParaNomeSintoma } from "@/lib/symptoms-list";

export const Route = createFileRoute("/meus-registros")({
  head: () => ({
    meta: [{ title: "Meus registros — Agenda de Virtudes" }],
  }),
  component: MeusRegistros,
});

function FormularioEdicao({
  registro,
  onSalvo,
  onCancelar,
}: {
  registro: RegistroVirtude;
  onSalvo: () => void;
  onCancelar: () => void;
}) {
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [virtudesOpcoes] = useState(() => embaralharVirtudes());
  const [dataRegistro, setDataRegistro] = useState(() =>
    paraInputDatetimeLocal(registro.data_registro),
  );
  const [virtude, setVirtude] = useState(registro.virtude);
  const [modalidade, setModalidade] = useState(registro.modalidade);
  const [emocao, setEmocao] = useState<string[]>(() => parseEmocoes(registro.emocao_atual));
  const [sintomas, setSintomas] = useState<string[]>(() => parseSintomas(registro.sintomas_atuais));
  const [sintomasDetalhe, setSintomasDetalhe] = useState("");
  const [descricao, setDescricao] = useState(registro.descricao_acoes);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErros({});

      const parsed = registroSchema.safeParse({
        data_registro: dataRegistro,
        virtude,
        modalidade,
        emocao_atual: emocao,
        sintomas_atuais: sintomas.length > 0 ? sintomas : null,
        descricao_acoes: descricao,
      });

      if (!parsed.success) {
        const map: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const campo = String(issue.path[0] ?? "form");
          if (!map[campo]) map[campo] = issue.message;
        }
        setErros(map);
        return;
      }

      setSalvando(true);
      const result = await atualizarRegistro({
        data: {
          id: registro.id,
          campos: parsed.data,
        },
      });
      setSalvando(false);

      if (!result.ok) {
        toast.error(result.erro ?? "Erro ao atualizar registro.");
        return;
      }

      toast.success("Registro atualizado com sucesso!");
      onSalvo();
    },
    [registro.id, dataRegistro, virtude, modalidade, emocao, sintomas, descricao, onSalvo],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`data-${registro.id}`}>Data da prática</Label>
          <Input
            ref={firstFieldRef}
            id={`data-${registro.id}`}
            type="datetime-local"
            value={dataRegistro}
            onChange={(e) => setDataRegistro(e.target.value)}
            required
          />
          {erros.data_registro && <p className="text-sm text-red-500">{erros.data_registro}</p>}
        </div>

        <div className="space-y-2">
          <Label>Virtude trabalhada</Label>
          <Select value={virtude} onValueChange={setVirtude}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione a virtude" />
            </SelectTrigger>
            <SelectContent>
              {virtudesOpcoes.map((v) => (
                <SelectItem key={v.slug} value={v.slug}>
                  {v.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {erros.virtude && <p className="text-sm text-red-500">{erros.virtude}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Modalidade</Label>
        <Select
          value={modalidade}
          onValueChange={(val: "grupo" | "individual") => setModalidade(val)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Em grupo ou individual?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grupo">Em grupo</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
          </SelectContent>
        </Select>
        {erros.modalidade && <p className="text-sm text-red-500">{erros.modalidade}</p>}
      </div>

      <div className="space-y-2">
        <Label>Emoções do momento</Label>
        <EmotionCheckboxGroup value={emocao} onChange={setEmocao} />
        {erros.emocao_atual && <p className="text-sm text-red-500">{erros.emocao_atual}</p>}
      </div>

      <div className="space-y-2">
        <Label>Sintomas atuais (opcional)</Label>
        <SymptomCheckboxGroup
          value={sintomas}
          onChange={setSintomas}
          detalhe={sintomasDetalhe}
          onDetalheChange={setSintomasDetalhe}
        />
        {erros.sintomas_atuais && <p className="text-sm text-red-500">{erros.sintomas_atuais}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`descricao-${registro.id}`}>Descrição das ações e percepções</Label>
        <Textarea
          id={`descricao-${registro.id}`}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Como você praticou a virtude? O que fez, o que percebeu?"
          rows={4}
          maxLength={5000}
          required
        />
        <p className="text-xs text-muted-foreground">{descricao.length}/5000</p>
        {erros.descricao_acoes && <p className="text-sm text-red-500">{erros.descricao_acoes}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button type="submit" disabled={salvando}>
          {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
        <Button type="button" variant="outline" onClick={onCancelar} disabled={salvando}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );
}

function MeusRegistrosConteudo() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setAgora(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["meus-registros", user?.id],
    queryFn: async () => meusRegistros(),
    enabled: !!user,
  });

  const registros = useMemo(() => (data?.ok ? data.registros : []), [data]);

  const handleExcluir = useCallback(
    async (id: number) => {
      setExcluindoId(id);
      const result = await excluirRegistro({ data: { id } });
      setExcluindoId(null);

      if (result.ok) {
        toast.success("Registro excluído com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["meus-registros"] });
      } else {
        toast.error(result.erro ?? "Erro ao excluir registro.");
      }
    },
    [queryClient],
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (data && !data.ok) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center text-red-500">
        <p>{data.erro}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Meus registros</h1>
        <p className="text-sm text-muted-foreground">
          Histórico dos seus registros de virtudes realizadas.
        </p>
      </div>

      {registros.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <p className="text-base">Você ainda não fez nenhum registro.</p>
          <p className="mt-2 text-sm">Comece registrando a virtude que praticou hoje.</p>
          <Button asChild className="mt-4">
            <a href="/">Fazer primeiro registro</a>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {registros.map((registro) => {
            const base = registro.atualizado_em ?? registro.criado_em;
            const modificavel = agora - Date.parse(base) <= JANELA_EDICAO_MS;
            const isEditando = editandoId === registro.id;

            return (
              <Card key={registro.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-xl font-semibold">
                      {nomeVirtude(registro.virtude)}
                    </CardTitle>
                    <Badge variant={registro.modalidade === "grupo" ? "secondary" : "outline"}>
                      {registro.modalidade === "grupo" ? "Em grupo" : "Individual"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatarDataPtBr(registro.data_registro)}
                  </p>
                </CardHeader>
                <CardContent>
                  {isEditando ? (
                    <FormularioEdicao
                      registro={registro}
                      onSalvo={() => {
                        setEditandoId(null);
                        queryClient.invalidateQueries({ queryKey: ["meus-registros"] });
                      }}
                      onCancelar={() => setEditandoId(null)}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-foreground">Emoções: </span>
                        <span className="flex flex-wrap gap-1 text-sm text-muted-foreground">
                          {parseEmocoes(registro.emocao_atual).map((slug) => (
                            <Badge key={slug} variant="secondary">
                              {slugParaNomeEmocao(slug)}
                            </Badge>
                          ))}
                        </span>
                      </div>

                      {registro.sintomas_atuais && (
                        <div>
                          <span className="text-sm font-medium text-foreground">Sintomas: </span>
                          <span className="flex flex-wrap gap-1 text-sm text-muted-foreground">
                            {parseSintomas(registro.sintomas_atuais).map((slug) => (
                              <Badge key={slug} variant="secondary">
                                {slugParaNomeSintoma(slug)}
                              </Badge>
                            ))}
                          </span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="text-sm font-medium text-foreground">
                          Descrição das ações:
                        </span>
                        <p className="whitespace-pre-wrap rounded-md border border-border/50 bg-muted/50 p-3 text-sm text-muted-foreground">
                          {registro.descricao_acoes}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!modificavel}
                          onClick={() => setEditandoId(registro.id)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!modificavel || excluindoId === registro.id}
                          onClick={() => setConfirmDeleteId(registro.id)}
                        >
                          {excluindoId === registro.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Excluir"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={confirmDeleteId !== null}
        onOpenChange={(o) => !o && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDeleteId !== null) {
                  handleExcluir(confirmDeleteId);
                  setConfirmDeleteId(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MeusRegistros() {
  return (
    <ProtectedRoute>
      <MeusRegistrosConteudo />
    </ProtectedRoute>
  );
}
