import request from "./request";
import { baseUrl } from './config';
import { useMutation, useQueryClient } from "react-query";

const Admin = ({ moves }) => {
  const queryClient = useQueryClient();
  const search = document.location.search;
  const match = search.match(/game=(\d+)/);
  const gameIndex = match && match[1];
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

  if (!moves) {
    return null;
  }
  return (
    <div>
      {moves.lastMove !== null ? (
        <>
          <div>Coup numéro: {moves.lastMove}</div>
          <button type="button" onClick={() => setIndex(moves.lastMove + 1)}>
            Coup suivant
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setIndex(0)}>
          Créer la partie
        </button>
      )}
      {moves.moves && (
        <>
          <div>Liste des coups</div>
          <ul>
            {moves.moves.map(([move, count]) => (
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
