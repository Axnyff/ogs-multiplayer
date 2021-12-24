import { useState } from "react";
import request from "./request";
import { useQuery, useQueryClient, useMutation } from "react-query";
import "./App.css";
import Admin from "./Admin";

export const baseUrl =
  process.env.NODE_ENV === "development" ? "http://localhost:3010/api" : "/api";

function App() {
  const { data } = useQuery(["logged"], () => request(`${baseUrl}/loggedIn`));
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const search = document.location.search;
  const match = search.match(/game=(\d+)/);
  const gameIndex = match && match[1];

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
        queryClient.refetchQueries("moves", { force: true});
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
  return (
    <div className="App">
      <iframe
        title="OGS"
        frameBorder="no"
        height="800px"
        width="1000px"
        src={`https://online-go.com/game/${gameIndex}`}
      />
      <div>
        <form onSubmit={handleSubmit}>
          <label htmlFor="moveId">Entrez un coup</label>
          <br />
          <input
            id="moveId"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button type="submit">Valider</button>
        </form>
        <br />
        <br />
        {data.isAdmin && <Admin />}
      </div>
    </div>
  );
}

export default App;
