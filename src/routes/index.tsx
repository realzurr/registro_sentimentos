import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/protected-route";
import { salvarRegistro } from "@/lib/api/registros.server";
import { virtudes } from "@/lib/virtues-list";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmotionCheckboxGroup } from "@/components/emotion-checkbox-group";
import { SymptomCheckboxGroup } from "@/components/symptom-checkbox-group";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Registro do dia — Agenda de Virtudes" }],
  }),
  component: RegistroDoDia,
});

function FormularioRegistro() {
  const { getToken, user } = useAuth();
  const [dataRegistro, setDataRegistro] = useState(agoraLocal());
  const [virtude, setVirtude] = useState("");
  const [modalidade, setModalidade] = useState("");
  const [emocao, setEmocao] = useState<string[]>([]);
  const [sintomas, setSintomas] = useState<string[]>([]);
  const [sintomasDetalhe, setSintomasDetalhe] = useState("");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErros({});
      setMensagemSucesso(null);

      const token = await getToken();
      if (!token || !user) {
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
      const result = await salvarRegistro({ data: { ...parsed.data, token } });
      setSalvando(false);

      if (!result.ok) {
        toast.error(result.erro);
        return;
      }

      const msg = "Registro realizado com sucesso!";
      toast.success(msg);
      setMensagemSucesso(msg);
      setVirtude("");
      setModalidade("");
      setEmocao([]);
      setSintomas([]);
      setSintomasDetalhe("");
      setDescricao("");
      setDataRegistro(agoraLocal());
    },
    [getToken, user, dataRegistro, virtude, modalidade, emocao, sintomas, descricao],
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Registro do dia</CardTitle>
          <CardDescription>
            Registre a virtude trabalhada hoje e como você está se sentindo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mensagemSucesso && (
            <Alert className="mb-5 border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <AlertTitle className="font-semibold">Sucesso!</AlertTitle>
              <AlertDescription>{mensagemSucesso}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="data">Data da prática</Label>
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

              <div className="space-y-2">
                <Label>Virtude trabalhada</Label>
                <Select value={virtude} onValueChange={setVirtude}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a virtude" />
                  </SelectTrigger>
                  <SelectContent>
                    {virtudes.map((v) => (
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
              <Select value={modalidade} onValueChange={setModalidade}>
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
              {erros.sintomas_atuais && (
                <p className="text-sm text-red-500">{erros.sintomas_atuais}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição das ações e percepções</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Como você praticou a virtude? O que fez, o que percebeu?"
                rows={5}
                maxLength={5000}
                required
              />
              <p className="text-xs text-muted-foreground">{descricao.length}/5000</p>
              {erros.descricao_acoes && (
                <p className="text-sm text-red-500">{erros.descricao_acoes}</p>
              )}
            </div>

            <Button type="submit" disabled={salvando} className="w-full sm:w-auto">
              {salvando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Registro
            </Button>
          </form>
        </CardContent>
      </Card>
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
