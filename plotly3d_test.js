async function draw3DPlot() {
  const status = document.getElementById("status");

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

    // サンプルデータに合わせて p_x2, p_y2, p_z2 を使う
    // 実際の列名が p_x, p_y, p_z なら、ここだけ変更する
    const pKeys = {
      x: "p_x2",
      y: "p_y2",
      z: "p_z2"
    };

    function hasFiniteNumber(row, key) {
      return (
        row[key] !== undefined &&
        row[key] !== null &&
        Number.isFinite(Number(row[key]))
      );
    }

    function getCompleteRows(rows) {
      return rows
        .filter(row => {
          if (!hasFiniteNumber(row, "Duration(min)")) {
            return false;
          }

          const hasVectorColumns = vectorNames.every(vectorName =>
            axes.every(axis => hasFiniteNumber(row, `${vectorName}_${axis}`))
          );

          const hasPColumns = axes.every(axis =>
            hasFiniteNumber(row, pKeys[axis])
          );

          return hasVectorColumns && hasPColumns;
        })
        .sort((a, b) => Number(a["Duration(min)"]) - Number(b["Duration(min)"]));
    }

    const completeRows = getCompleteRows(rows);

    if (completeRows.length === 0) {
      throw new Error(
        "pd, ml, adab の x, y, z 成分と p_x2, p_y2, p_z2 がそろったデータが見つかりません。"
      );
    }

    function makeHoverCustomData(row) {
      return [
        row.lamina_label ?? "",
        Number(row["Duration(min)"]),

        Number(row.pd_x),
        Number(row.pd_y),
        Number(row.pd_z),

        Number(row.ml_x),
        Number(row.ml_y),
        Number(row.ml_z),

        Number(row.adab_x),
        Number(row.adab_y),
        Number(row.adab_z),

        -Number(row[pKeys.x]),
        -Number(row[pKeys.y]),
        -Number(row[pKeys.z])
      ];
    }

    const sharedHoverTemplate =
      "<b>%{fullData.name}</b><br>" +
      "label: %{customdata[0]}<br>" +
      "Duration: %{customdata[1]} min<br>" +
      "<br>" +
      "<b>pd</b>: " +
      "(%{customdata[2]:.4f}, %{customdata[3]:.4f}, %{customdata[4]:.4f})<br>" +
      "<b>ml</b>: " +
      "(%{customdata[5]:.4f}, %{customdata[6]:.4f}, %{customdata[7]:.4f})<br>" +
      "<b>adab</b>: " +
      "(%{customdata[8]:.4f}, %{customdata[9]:.4f}, %{customdata[10]:.4f})<br>" +
      "<b>-p</b>: " +
      "(%{customdata[11]:.4f}, %{customdata[12]:.4f}, %{customdata[13]:.4f})" +
      "<extra></extra>";

    function makeVectorTrace(vectorName) {
      const xKey = `${vectorName}_x`;
      const yKey = `${vectorName}_y`;
      const zKey = `${vectorName}_z`;

      return {
        type: "scatter3d",
        mode: "lines+markers",
        name: vectorName,

        x: completeRows.map(row => Number(row[xKey])),
        y: completeRows.map(row => Number(row[yKey])),
        z: completeRows.map(row => Number(row[zKey])),

        customdata: completeRows.map(makeHoverCustomData),

        marker: {
          size: 4
        },

        line: {
          width: 5
        },

        hovertemplate: sharedHoverTemplate
      };
    }

    function makeUnitSphereSurfaceTrace() {
      const nTheta = 31;
      const nPhi = 61;

      const x = [];
      const y = [];
      const z = [];

      for (let i = 0; i < nTheta; i++) {
        const theta = Math.PI * i / (nTheta - 1);

        const xRow = [];
        const yRow = [];
        const zRow = [];

        for (let j = 0; j < nPhi; j++) {
          const phi = 2 * Math.PI * j / (nPhi - 1);

          xRow.push(Math.sin(theta) * Math.cos(phi));
          yRow.push(Math.sin(theta) * Math.sin(phi));
          zRow.push(Math.cos(theta));
        }

        x.push(xRow);
        y.push(yRow);
        z.push(zRow);
      }

      return {
        type: "surface",
        name: "unit sphere",
        x: x,
        y: y,
        z: z,
        opacity: 0.08,
        showscale: false,
        showlegend: false,
        hoverinfo: "skip",
        colorscale: [
          [0, "rgb(180,180,180)"],
          [1, "rgb(180,180,180)"]
        ]
      };
    }

    function makeSphereGridTrace() {
      const x = [];
      const y = [];
      const z = [];

      const n = 121;

      function addLine(points) {
        for (const p of points) {
          x.push(p[0]);
          y.push(p[1]);
          z.push(p[2]);
        }

        x.push(null);
        y.push(null);
        z.push(null);
      }

      // 緯線: z が一定の円
      const latitudeCount = 9;

      for (let i = 1; i < latitudeCount; i++) {
        const theta = Math.PI * i / latitudeCount;
        const points = [];

        for (let j = 0; j < n; j++) {
          const phi = 2 * Math.PI * j / (n - 1);

          points.push([
            Math.sin(theta) * Math.cos(phi),
            Math.sin(theta) * Math.sin(phi),
            Math.cos(theta)
          ]);
        }

        addLine(points);
      }

      // 経線: 極を通る大円
      const longitudeCount = 12;

      for (let i = 0; i < longitudeCount; i++) {
        const phi = 2 * Math.PI * i / longitudeCount;
        const points = [];

        for (let j = 0; j < n; j++) {
          const theta = Math.PI * j / (n - 1);

          points.push([
            Math.sin(theta) * Math.cos(phi),
            Math.sin(theta) * Math.sin(phi),
            Math.cos(theta)
          ]);
        }

        addLine(points);
      }

      return {
        type: "scatter3d",
        mode: "lines",
        name: "sphere grid",
        x: x,
        y: y,
        z: z,
        showlegend: false,
        hoverinfo: "skip",
        line: {
          width: 2,
          color: "rgba(80, 80, 80, 0.45)"
        }
      };
    }

    function makeOriginTrace() {
      return {
        type: "scatter3d",
        mode: "markers",
        name: "origin",
        x: [0],
        y: [0],
        z: [0],
        marker: {
          size: 7,
          color: "black"
        },
        hovertemplate:
          "<b>origin</b><br>" +
          "x: 0<br>" +
          "y: 0<br>" +
          "z: 0" +
          "<extra></extra>"
      };
    }

    function makeNegativePLineTrace() {
      const x = [];
      const y = [];
      const z = [];

      for (const row of completeRows) {
        x.push(0);
        y.push(0);
        z.push(0);

        x.push(-Number(row[pKeys.x]));
        y.push(-Number(row[pKeys.y]));
        z.push(-Number(row[pKeys.z]));

        x.push(null);
        y.push(null);
        z.push(null);
      }

      return {
        type: "scatter3d",
        mode: "lines",
        name: "-p",
        x: x,
        y: y,
        z: z,
        line: {
          color: "black",
          width: 4
        },
        hoverinfo: "skip"
      };
    }

    const traces = [
      makeUnitSphereSurfaceTrace(),
      makeSphereGridTrace(),
      makeOriginTrace(),
      makeNegativePLineTrace(),
      ...vectorNames.map(makeVectorTrace)
    ];

    const layout = {
      title: "Trajectories on unit sphere",

      scene: {
        xaxis: {
          title: "x",
          range: [-1.1, 1.1],
          zeroline: true
        },
        yaxis: {
          title: "y",
          range: [-1.1, 1.1],
          zeroline: true
        },
        zaxis: {
          title: "z",
          range: [-1.1, 1.1],
          zeroline: true
        },
        aspectmode: "cube",
        camera: {
          eye: {
            x: 1.6,
            y: 1.6,
            z: 1.2
          }
        }
      },

      margin: {
        l: 0,
        r: 0,
        t: 50,
        b: 0
      }
    };

    const config = {
      responsive: true
    };

    Plotly.newPlot("plot3d", traces, layout, config);

    status.textContent =
      `${completeRows.length} 件のデータを描画しました。pd, ml, adab と -p 方向を球面上に表示しています。`;

  } catch (error) {
    console.error(error);
    status.textContent = "エラー: " + error.message;
  }
}

draw3DPlot();