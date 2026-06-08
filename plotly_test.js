async function drawDashboard() {
  const status = document.getElementById("status");
  const vectorSelect = document.getElementById("vectorSelect");

  try {
    if (typeof Plotly === "undefined") {
      throw new Error("Plotly.js が読み込まれていません。");
    }

    const response = await fetch("./data.json");

    if (!response.ok) {
      throw new Error(`data.json を読み込めませんでした。HTTP status: ${response.status}`);
    }

    const rows = await response.json();

    if (!Array.isArray(rows)) {
      throw new Error("data.json の中身が配列ではありません。");
    }

    const vectorNames = ["pd", "ml", "adab"];
    const axes = ["x", "y", "z"];

    for (const vectorName of vectorNames) {
      const option = document.createElement("option");
      option.value = vectorName;
      option.textContent = vectorName;
      vectorSelect.appendChild(option);
    }

    function drawPlot(vectorName) {
      const columns = axes.map(axis => `${vectorName}_${axis}`);

      const validRows = rows.filter(d =>
        d["Duration(min)"] !== undefined &&
        d["Duration(min)"] !== null &&
        columns.every(column =>
          d[column] !== undefined &&
          d[column] !== null
        )
      );

      if (validRows.length === 0) {
        throw new Error(`${vectorName}_x, ${vectorName}_y, ${vectorName}_z を持つデータが見つかりません。`);
      }

      const xValues = validRows.map(d => Number(d["Duration(min)"]));
      const labels = validRows.map(d => d.lamina_label ?? "");

      const traces = columns.map(column => {
        return {
          x: xValues,
          y: validRows.map(d => Number(d[column])),
          text: labels,
          mode: "lines+markers",
          type: "scatter",
          name: column,
          hovertemplate:
            "label: %{text}<br>" +
            "Duration: %{x} min<br>" +
            column + ": %{y}<extra></extra>"
        };
      });

      const layout = {
        title: `${vectorName} vector components`,
        xaxis: {
          title: "Duration (min)"
        },
        yaxis: {
          title: "component value"
        },
        margin: {
          l: 60,
          r: 30,
          t: 50,
          b: 60
        }
      };

      const config = {
        responsive: true
      };

      Plotly.react("plot", traces, layout, config);

      status.textContent =
        `${validRows.length} 件のデータを描画しました。表示中: ${columns.join(", ")}`;
    }

    vectorSelect.addEventListener("change", () => {
      drawPlot(vectorSelect.value);
    });

    drawPlot(vectorNames[0]);

  } catch (error) {
    console.error(error);
    status.textContent = "エラー: " + error.message;
  }
}

drawDashboard();