import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";

const PALETTE = {
  azulBorda: "#6366f1",
  azulFundo: "rgba(99, 102, 241, 0.2)",
  laranjaBorda: "#f59e0b",
  laranjaFundo: "rgba(245, 158, 11, 0.15)",
  cinza: "rgba(156, 163, 175, 0.5)",
  cinzaBorda: "#9ca3af",
};

interface GraficoBaseProps {
  labels: string[];
  usuario: number[];
  grupo: number[];
  nomeUsuario?: string;
  nomeGrupo?: string;
}

export function GraficoRadarComparativo({
  labels,
  usuario,
  grupo,
  nomeUsuario = "Você",
  nomeGrupo = "Grupo (média)",
}: GraficoBaseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "radar",
      data: {
        labels,
        datasets: [
          {
            label: nomeUsuario,
            data: usuario,
            backgroundColor: PALETTE.azulFundo,
            borderColor: PALETTE.azulBorda,
            borderWidth: 2,
            pointBackgroundColor: PALETTE.azulBorda,
          },
          {
            label: nomeGrupo,
            data: grupo,
            backgroundColor: PALETTE.laranjaFundo,
            borderColor: PALETTE.laranjaBorda,
            borderWidth: 2,
            borderDash: [5, 5],
            pointBackgroundColor: PALETTE.laranjaBorda,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 12 } } },
        },
        scales: {
          r: {
            beginAtZero: true,
            ticks: { font: { size: 10 }, backdropColor: "transparent" },
            pointLabels: { font: { size: 11 } },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [labels, usuario, grupo, nomeUsuario, nomeGrupo]);

  return (
    <div className="relative h-[380px] w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}

export function GraficoEvolucao({
  labels,
  usuario,
  grupo,
  nomeUsuario = "Você",
  nomeGrupo = "Grupo",
}: GraficoBaseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: nomeUsuario,
            data: usuario,
            borderColor: PALETTE.azulBorda,
            backgroundColor: PALETTE.azulBorda,
            fill: false,
            tension: 0.3,
            borderWidth: 3,
          },
          {
            label: nomeGrupo,
            data: grupo,
            borderColor: PALETTE.cinzaBorda,
            backgroundColor: PALETTE.cinza,
            fill: false,
            tension: 0.3,
            borderWidth: 2,
            borderDash: [6, 4],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 12 } } },
        },
        scales: {
          x: {
            title: { display: true, text: "Semana" },
            ticks: { font: { size: 10 }, maxRotation: 45 },
          },
          y: { beginAtZero: true, title: { display: true, text: "Registros" } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [labels, usuario, grupo, nomeUsuario, nomeGrupo]);

  return (
    <div className="relative h-[300px] w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}

export function GraficoTopEmocoes({
  labels,
  usuario,
  grupo,
  nomeUsuario = "Você",
  nomeGrupo = "Grupo (média)",
}: GraficoBaseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: nomeUsuario,
            data: usuario,
            backgroundColor: PALETTE.azulBorda,
            borderColor: PALETTE.azulBorda,
            borderWidth: 1,
          },
          {
            label: nomeGrupo,
            data: grupo,
            backgroundColor: PALETTE.cinza,
            borderColor: PALETTE.cinzaBorda,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 12 } } },
        },
        scales: {
          x: { beginAtZero: true, title: { display: true, text: "Frequência" } },
          y: { ticks: { font: { size: 11 } } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [labels, usuario, grupo, nomeUsuario, nomeGrupo]);

  return (
    <div className="relative h-[320px] w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}
