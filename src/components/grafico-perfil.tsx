import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";

interface GraficoPerfilProps {
  rotulos: string[];
  usuario: number[];
  grupo: number[];
  nomeUsuario: string;
}

export function GraficoPerfil({ rotulos, usuario, grupo, nomeUsuario }: GraficoPerfilProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "radar",
      data: {
        labels: rotulos,
        datasets: [
          {
            label: nomeUsuario,
            data: usuario,
            backgroundColor: "rgba(49,77,59,0.25)",
            borderColor: "#314D3B",
            borderWidth: 2,
            pointBackgroundColor: "#314D3B",
          },
          {
            label: "Média do grupo",
            data: grupo,
            backgroundColor: "rgba(184,149,84,0.25)",
            borderColor: "#B89554",
            borderWidth: 2,
            pointBackgroundColor: "#B89554",
            borderDash: [5, 5],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.r}%`,
            },
          },
        },
        scales: {
          r: {
            beginAtZero: true,
            suggestedMax: 100,
            ticks: { stepSize: 25, callback: (v) => `${v}%` },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [rotulos, usuario, grupo, nomeUsuario]);

  return (
    <div className="relative h-[400px] w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}
