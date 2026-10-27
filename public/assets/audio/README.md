# Áudio do Monkey Fast

Todos os sons do jogo são **sintetizados em tempo real** (src/systems/AudioManager.js),
então o jogo funciona sem nenhum arquivo aqui.

Para trocar um som por um arquivo definitivo (livre de direitos / licenciado):

1. Coloque o arquivo nesta pasta (`.mp3`, `.ogg` ou `.wav`).
2. Mapeie a chave em `manifest.json`:

```json
{
  "sfx":   { "jump": "salto.mp3", "banana": "banana.ogg" },
  "music": { "music_game": "trilha.mp3", "music_menu": "menu.mp3", "music_victory": "vitoria.mp3" }
}
```

Chaves de efeitos: `click`, `step`, `jump`, `grab`, `swing`, `release`, `land`, `fall`,
`gameover`, `banana`, `mango`, `crackle`, `guava`, `warp`, `powerEnd`, `scream`, `chest`,
`roar`, `jaguarScared`, `thunder`, `whoosh`, `hug`, `heart`, `perfect`.

Músicas em arquivo tocam em loop; durante os power-ups são aceleradas (playbackRate).
A trilha sintetizada usa uma variação 2X sincronizada no compasso.
