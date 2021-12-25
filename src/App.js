import { useState } from "react";
import Goban from "./goban";
import request from "./request";
import { useQuery, useQueryClient, useMutation } from "react-query";
import "./App.css";
import Admin from "./Admin";

export const baseUrl =
  process.env.NODE_ENV === "development" ? "http://localhost:3010/api" : "/api";

function App() {
  const { data } = useQuery(["logged"], () => request(`${baseUrl}/loggedIn`));
  const { data: dataMoves } = useQuery(
    ["moves", data?.isAdmin],
    () => {
      if (data?.isAdmin) {
        return request(`${baseUrl}/moves?gameIndex=${gameIndex}`);
      }
      return undefined;
    },
    {
      refetchInterval: 500,
    }
  );
  const search = document.location.search;
  const match = search.match(/game=(\d+)/);
  const gameIndex = match && match[1];
  const { data: dataBoard } = useQuery(
    ["board"],
    () => request(`${baseUrl}/board?gameIndex=${gameIndex}`),
    {
      refetchInterval: 500,
    }
  );
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");

  const { mutateAsync: makeMove } = useMutation(
    () => {
      fetch(`${baseUrl}/move`, {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        method: "POST",
        body: JSON.stringify({ move: value, gameId: gameIndex }),
      });
    },

    {
      onSuccess: () => {
        queryClient.refetchQueries("moves", { force: true });
      },
    }
  );

  const { mutateAsync } = useMutation(
    (value) => {
      request(`${baseUrl}/level`, {
        method: "POST",
        body: { level: value },
      });
    },

    {
      onSuccess: () => {
        queryClient.setQueryData("logged", { loggedIn: true });
      },
    }
  );

  if (!data) {
    return "Loading";
  }
  const handleSubmitLevel = (e) => {
    e.preventDefault();
    mutateAsync(value);
    setValue("");
  };

  if (!data.loggedIn) {
    return (
      <div className="App">
        <form onSubmit={handleSubmitLevel}>
          <label htmlFor="level">Quel est votre niveau ?</label>
          <br />
          <input
            id="level"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button type="submit">Valider</button>
        </form>
      </div>
    );
  }

  if (gameIndex === null) {
    return <div>Pas de jeu réferencé dans l'url</div>;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    makeMove();
    setValue("");
  };
  let stones;
  let markers;

  const getLetter = (indexRow) => {
    if (indexRow > 7) {
      indexRow = indexRow + 1;
    }
    return String.fromCharCode(65 + indexRow);
  };

  if (dataBoard) {
    stones = {};
    markers = {};
    dataBoard.signMap.forEach((row, indexRow) => {
      row.forEach((pos, indexColumn) => {
        if (pos !== 0) {
          const coord = getLetter(indexColumn) + (dataBoard.width - indexRow);
          if (
            indexRow === dataBoard.lastMove[1] &&
            indexColumn === dataBoard.lastMove[0]
          ) {
            markers[coord] = "circle";
          }
          stones[coord] = pos === 1 ? "black" : "white";
        }
      });
    });
    if (dataMoves?.moves?.[0]) {
      markers[dataMoves?.moves[0]?.[0]] = "square";
    }
    if (value) {
      markers[value] = "triangle";
    }
  }

  return (
    <>
      {dataBoard?.victoryText && <h2>{dataBoard.victoryText}</h2>}
      {stones && (
        <div className="flex">
          <div className="goban-container">
            <Goban
              size={dataBoard?.width}
              onIntersectionClick={(el) => {
                setValue(el);
              }}
              stones={stones}
              markers={markers}
            />
          </div>
          <div className="margin">
            <div className="flex flex-center">
              <i className="capture black" />
              <div>
                <strong>{dataBoard.black}</strong>
                <div>Captures: {dataBoard._captures[0]}</div>
              </div>
            </div>
            <div className="flex flex-center">
              <i className="capture white" />
              <div>
                <strong>{dataBoard.white}</strong>
                <div>Captures: {dataBoard._captures[1]}</div>
              </div>
            </div>
            <div className="margin-around">Komi: {dataBoard.komi}</div>
            <form className="margin-bottom" onSubmit={handleSubmit}>
              <label htmlFor="moveId">Entrez un coup</label>
              <br />
              <input
                id="moveId"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <button type="submit">Valider</button>
              <br />
              <div className="flex">
                <button type="button" onClick={() => setValue("Pass")}>
                  Passer
                </button>
                <button type="button" onClick={() => setValue("Resign")}>
                  Abandonner
                </button>
              </div>
            </form>
        {data.isAdmin && <Admin moves={dataMoves} />}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
