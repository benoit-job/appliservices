<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\ArticleInventaire;
use App\Models\MouvementInventaire;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InventaireController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        return $this->ok([
            'donnees' => ArticleInventaire::with('activite:id,nom,code')
                ->when($request->filled('activite_id'), fn ($q) => $q->where('activite_id', $request->integer('activite_id')))
                ->latest()
                ->paginate($request->integer('par_page', 50)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $article = ArticleInventaire::create($this->validerArticle($request));
        $this->auditer($request, 'creer', 'articles_inventaire', $article->id, $article->toArray());

        return $this->ok(['donnees' => $article->load('activite')], 'Article d’inventaire créé.', 201);
    }

    public function update(Request $request, ArticleInventaire $article): JsonResponse
    {
        $article->update($this->validerArticle($request));
        $this->auditer($request, 'modifier', 'articles_inventaire', $article->id, $article->toArray());

        return $this->ok(['donnees' => $article->refresh()->load('activite')], 'Article d’inventaire modifié.');
    }

    public function mouvement(Request $request, ArticleInventaire $article): JsonResponse
    {
        $donnees = $request->validate([
            'type_mouvement' => ['required', Rule::in(['entree', 'sortie', 'ajustement'])],
            'quantite' => ['required', 'numeric', 'min:0.01'],
            'motif' => ['required', 'string', 'max:150'],
            'transaction_id' => ['nullable', 'exists:transactions,id'],
            'date_mouvement' => ['required', 'date'],
        ]);

        $mouvement = $article->mouvements()->create([
            ...$donnees,
            'saisi_par' => $request->user()->id,
        ]);

        $nouvelleQuantite = match ($donnees['type_mouvement']) {
            'entree' => (float) $article->quantite + (float) $donnees['quantite'],
            'sortie' => max(0, (float) $article->quantite - (float) $donnees['quantite']),
            'ajustement' => (float) $donnees['quantite'],
        };
        $article->update(['quantite' => $nouvelleQuantite]);

        $this->auditer($request, 'mouvement', 'articles_inventaire', $article->id, $donnees);

        return $this->ok(['donnees' => $mouvement], 'Mouvement enregistré.', 201);
    }

    public function mouvements(ArticleInventaire $article): JsonResponse
    {
        return $this->ok([
            'donnees' => MouvementInventaire::with('article')
                ->where('article_inventaire_id', $article->id)
                ->latest('date_mouvement')
                ->get(),
        ]);
    }

    private function validerArticle(Request $request): array
    {
        return $request->validate([
            'activite_id' => ['required', 'exists:activites,id'],
            'nom' => ['required', 'string', 'max:150'],
            'type_article' => ['required', Rule::in(['bien_durable', 'stock_consommable', 'cheptel'])],
            'quantite' => ['required', 'numeric', 'min:0'],
            'unite' => ['required', 'string', 'max:30'],
            'valeur_unitaire' => ['nullable', 'numeric', 'min:0'],
            'seuil_alerte' => ['nullable', 'numeric', 'min:0'],
            'attributs' => ['nullable', 'array'],
        ]);
    }
}
