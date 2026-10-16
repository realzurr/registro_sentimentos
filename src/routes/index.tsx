import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/protected-route";
import { meusRegistros, salvarRegistro } from "@/lib/api/registros.server";
import { registroSchema } from "@/lib/api/registros.server";
import { agoraLocal } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmotionCheckboxGroup } from "@/components/emotion-checkbox-group";
import { SymptomCheckboxGroup } from "@/components/symptom-checkbox-group";
import { cn } from "@/lib/utils";
import type { RegistroVirtude } from "@/lib/db.server";
import { parseEmocoes, parseSintomas } from "@/lib/parse-utils";
import { embaralharVirtudes, nomeVirtude, type VirtudeOpcao } from "@/lib/virtues-list";
import { slugParaNomeEmocao } from "@/lib/emotions-list";
import { slugParaNomeSintoma } from "@/lib/symptoms-list";
import { formatarDataPtBr } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Registro do dia — Agenda de Virtudes" }],
  }),
  component: RegistroDoDia,
});

function ModalSucesso({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  useEffect(() => {
    if (!aberto) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Registro salvo"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-primary/15">
          <CheckCircle2 className="h-8 w-8 text-green-primary" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Registro salvo com sucesso!</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Obrigado por registrar a sua prática no dia de hoje.
        </p>
        <Button variant="secondary" className="w-full" onClick={onFechar}>
          Entendi
        </Button>
      </div>
    </div>
  );
}

function CampoVirtudeSelect({
  value,
  onChange,
  opcoes,
  erro,
}: {
  value: string;
  onChange: (v: string) => void;
  opcoes: VirtudeOpcao[];
  erro?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>Qual virtude você trabalhou?</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione a virtude" />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((v) => (
            <SelectItem key={v.slug} value={v.slug}>
              {v.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {erro && <p className="text-sm text-red-500">{erro}</p>}
    </div>
  );
}

function FormularioRegistro() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dataRegistro, setDataRegistro] = useState(agoraLocal());
  const [virtude, setVirtude] = useState("individuacao");
  const [virtudesOpcoes] = useState(() => embaralharVirtudes());
  const [modalidade, setModalidade] = useState("");
  const [emocao, setEmocao] = useState<string[]>([]);
  const [sintomas, setSintomas] = useState<string[]>([]);
  const [sintomasDetalhe, setSintomasDetalhe] = useState("");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [sucessoAberto, setSucessoAberto] = useState(false);

  const { data: dadosRegistros } = useQuery({
    queryKey: ["meus-registros", user?.id],
    queryFn: async () => meusRegistros(),
    enabled: !!user,
  });

  const registros = dadosRegistros?.ok ? (dadosRegistros.registros as RegistroVirtude[]) : [];

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErros({});

      if (!user) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

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
      const result = await salvarRegistro({ data: parsed.data });
      setSalvando(false);

      if (!result.ok) {
        toast.error(result.erro);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["meus-registros"] });
      setSucessoAberto(true);
      setVirtude("individuacao");
      setModalidade("");
      setEmocao([]);
      setSintomas([]);
      setSintomasDetalhe("");
      setDescricao("");
      setDataRegistro(agoraLocal());
    },
    [user, dataRegistro, virtude, modalidade, emocao, sintomas, descricao, queryClient],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Registro do dia</h1>
        <p className="mt-1 text-muted-foreground">
          Registre a virtude trabalhada hoje e como você está se sentindo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="glass shadow-soft">
          <CardHeader>
            <CardTitle className="text-xl text-green-dark">Dados da prática</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="data">Data e hora do registro</Label>
                <Input
                  id="data"
                  type="datetime-local"
                  value={dataRegistro}
                  onChange={(e) => setDataRegistro(e.target.value)}
                  required
                />
                {erros.data_registro && (
                  <p className="text-sm text-red-500">{erros.data_registro}</p>
                )}
              </div>
              <CampoVirtudeSelect
                value={virtude}
                onChange={setVirtude}
                opcoes={virtudesOpcoes}
                erro={erros.virtude}
              />
            </div>

            <div className="space-y-2">
              <Label>Como foi a prática?</Label>
              <div className="grid grid-cols-2 gap-4">
                {(
                  [
                    { valor: "grupo", label: "Em grupo", desc: "Prática realizada em grupo" },
                    { valor: "individual", label: "Individual", desc: "Prática individual" },
                  ] as const
                ).map((op) => {
                  const selecionado = modalidade === op.valor;
                  return (
                    <button
                      key={op.valor}
                      type="button"
                      onClick={() => setModalidade(op.valor)}
                      aria-pressed={selecionado}
                      className={cn(
                        "rounded-xl border-2 p-4 text-left transition-all",
                        selecionado
                          ? "border-green-primary bg-green-primary/10 shadow-sm"
                          : "border-border bg-white/70 hover:border-green-primary/50",
                      )}
                    >
                      <span className="block text-sm font-semibold text-foreground">
                        {op.label}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">{op.desc}</span>
                    </button>
                  );
                })}
              </div>
              {erros.modalidade && <p className="text-sm text-red-500">{erros.modalidade}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="glass shadow-soft">
          <CardHeader>
            <CardTitle className="text-xl text-green-dark">Como você está se sentindo?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Selecione suas emoções do momento</Label>
              <EmotionCheckboxGroup value={emocao} onChange={setEmocao} />
              {erros.emocao_atual && <p className="text-sm text-red-500">{erros.emocao_atual}</p>}
            </div>

            <div className="space-y-2">
              <Label>Está sentindo algum sintoma? (opcional)</Label>
              <SymptomCheckboxGroup
                value={sintomas}
                onChange={setSintomas}
                detalhe={sintomasDetalhe}
                onDetalheChange={setSintomasDetalhe}
              />
              {erros.sintomas_atuais && (
                <p className="text-sm text-red-500">{erros.sintomas_atuais}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass shadow-soft">
          <CardHeader>
            <CardTitle className="text-xl text-green-dark">Descrição das ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Como você praticou a virtude? O que fez, o que percebeu?"
              rows={5}
              maxLength={5000}
              required
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{descricao.length}/5000</p>
              {erros.descricao_acoes && (
                <p className="text-sm text-red-500">{erros.descricao_acoes}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={salvando} className="w-full py-6 text-base" size="lg">
          {salvando ? (
            <>
              <Loader2 className="mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Registro"
          )}
        </Button>
      </form>

      <div className="mt-10">
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">Seus registros</h2>
        {registros.length === 0 ? (
          <p className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">
            Você ainda não fez nenhum registro.
          </p>
        ) : (
          <div className="space-y-3">
            {registros.slice(0, 5).map((r) => (
              <Card key={r.id} className="glass shadow-soft">
                <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <div>
                    <p className="font-medium text-foreground">{nomeVirtude(r.virtude)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatarDataPtBr(r.data_registro)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {parseEmocoes(r.emocao_atual).map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-green-primary/10 px-2 py-0.5 text-xs text-green-dark"
                      >
                        {slugParaNomeEmocao(s)}
                      </span>
                    ))}
                    {parseSintomas(r.sintomas_atuais).map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold"
                      >
                        {slugParaNomeSintoma(s)}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ModalSucesso aberto={sucessoAberto} onFechar={() => setSucessoAberto(false)} />
    </div>
  );
}

function RegistroDoDia() {
  return (
    <ProtectedRoute>
      <FormularioRegistro />
    </ProtectedRoute>
  );
}
