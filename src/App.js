import { useState } from "react";
import request from './request';
import { useQuery, useMutation } from "react-query";
import "./App.css";

export const baseUrl =
  process.env.NODE_ENV === "development" ? "http://localhost:3010/api" : "/api";

function App() {
  const { data } = useQuery("logged", () =>
    request(`${baseUrl}/loggedIn`),
  );
  const [value, setValue] = useState("");
  const search = document.location.search;
  const match = search.match(/game=(\d+)/);
  const gameIndex = match && match[1];

  const { mutateAsync } = useMutation((value) => {
    fetch(`${baseUrl}/level`, {
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      method: "POST",
      body: JSON.stringify({ level: value }),
    });
  });
  console.log(data);

  if (!data) {
    return "Loading";
  }
  const handleSubmitLevel = (e) => {
    e.preventDefault();
    mutateAsync(value);
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

  console.log(data);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(value);
    setValue("");
  };
  return (
    <div className="App">
      <iframe title="OGS" frameBorder="no" height="800px" width="1000px" />
      <form onSubmit={handleSubmit}>
        <label htmlFor="moveId">Entrez un coup</label>
        <br />
        <input
          id="moveId"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </form>
    </div>
  );
}

export default App;
