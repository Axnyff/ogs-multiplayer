import request from "./request";
import { useQuery, useMutation, useQueryClient } from "react-query";

export const baseUrl =
  process.env.NODE_ENV === "development" ? "http://localhost:3010/api" : "/api";

const Admin = () => {
  const queryClient = useQueryClient();
  const search = document.location.search;
  const match = search.match(/game=(\d+)/);
  const gameIndex = match && match[1];
  const { data } = useQuery(["moves"], () => {
    return request(`${baseUrl}/moves?gameIndex=${gameIndex}`);
  }, {
    refetchInterval: 500,
  });
  const { mutateAsync: setIndex } = useMutation(
    (lastMove) =>
      request(`${baseUrl}/index`, {
        method: "POST",
        body: {
          gameIndex,
          lastMove,
        },
      }),
    {
      onSuccess: () => {
        queryClient.refetchQueries("moves");
      },
    }
  );

  if (!data) {
    return null;
  }
  return (
    <div>
      {data.lastMove !== null ? (
        <>
          <div>Coup numéro: {data.lastMove}</div>
          <button type="button" onClick={() => setIndex(data.lastMove + 1)}>
            Coup suivant
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setIndex(0)}>
          Créer la partie
        </button>
      )}
      {data.moves && (
        <>
          <div>Liste des coups</div>
          <ul>
            {data.moves.map(([move, count]) => (
              <li key={move}>
                {move} ({count})
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default Admin;
