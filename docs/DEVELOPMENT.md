# Monkey Fast — documentação técnica

Jogo 2D side-scroller para navegador (desktop e celular). Um chimpanzé atravessa a floresta na tempestade, saltando de cipó em cipó, para salvar a companheira encurralada por uma onça no topo da árvore mais alta.

**Tecnologias:** Phaser 3.90 · JavaScript (ES Modules) · Vite 7 · Vitest · Firebase (Hosting, Firestore, Auth anônima, Cloud Functions).

---

## Como executar

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes automatizados (física, fase, pontuação, power-ups, validação)
npm run build      # build de produção em dist/
npm run preview    # serve o build localmente
```

Sem configurar nada, o jogo roda **offline com ranking local** (salvo no navegador).

### Controles

| Ação | Teclado | Celular/tablet |
|---|---|---|
| Andar / impulsionar o balanço | A/D ou ←/→ | Joystick (canto inferior esquerdo) |
| Subir / descer pelo cipó | W/S ou ↑/↓ | Joystick para cima/baixo |
| Pular / soltar o cipó | Espaço | Botão **PULAR** |
| Pausar | Esc (ou P) | Botão ❚❚ |

---

## O que está implementado

- **Mecânica de cipós com física de pêndulo:** comprimento, ângulo, velocidade angular, gravidade, impulso ao "bombear", subir/descer conservando o momento angular, soltura que preserva o impulso, captura automática com raio de alcance, teste de travessia (não "atravessa" o cipó em alta velocidade), sem reagarrar o mesmo cipó logo após soltar e encaixe visual suave (sem teletransporte).
- **Física com passo fixo de 1/120 s:** o resultado é o mesmo em 30, 60 ou 144 FPS. A renderização interpola entre os passos.
- **Fase longa com 92 cipós** em 6 trechos (horizontal → subida → horizontal elevado → descida → travessia longa → subida diagonal), terminando num grande salto até o galho final. Os cipós têm **tamanhos sorteados pelo mapa** (curtos 170–215 px, médios 245–310 px, longos 340–430 px; os longos são também mais grossos) e ficam mais afastados conforme a fase avança. Câmera 2D com antecipação de movimento. Não há chão invisível: cair = Game Over.
- **Todos os saltos são verificados matematicamente** (`src/core/reachability.js`) e um **robô joga a fase inteira** nos testes, com e sem power-ups, usando a física real.
- **Cenário:** paralaxe em 7 camadas (céu da arte de referência, montanhas, 3 camadas de floresta, cipós, chuva/folhas), névoa, chuva em 2 camadas, relâmpagos que iluminam o cenário, folhas ao vento e vinheta.
- **100 bananas, 2 Mangas Mágicas e 2 Goiabas Mágicas:** bananas variam pela semente entre 16 e 32 px acima e abaixo dos voos de uma rota certificada. Os power-ups têm posições fixas nessa rota. Os dados são pré-calculados para não executar a certificação durante a abertura da partida.
- **Manga Mágica (7 s):** mais velocidade e impulso, faíscas elétricas, olhos brilhando, rastro elétrico. **Goiaba Mágica (7 s):** os cipós viram o cipó mágico (`cipo_magico-movimentos`) com brilho neon verde e balançam mais rápido, distorção temporal na tela, partículas mágicas. Ambas aceleram a música para 2X (uma única vez, mesmo com as duas ativas), a chuva e a paralaxe, com entrada e saída suaves.
- **Pontuação:** banana = 1, power-up = 1. Coletou tudo → bônus perfeito (básicos × 2) e animação **PERFECT RUN!**
- **Personagens com os quadros das suas folhas de animação** (macaco, macaca e onça) controlados por uma máquina de estados: parado, andando, correndo, preparando salto, saltando, alcançando o cipó, pendurado/balançando, subindo, descendo, soltando, caindo, desespero, morte, coletando, power-up, correndo eletrificado, gritando, batendo no peito e comemorando.
- **Cena final cinematográfica (~13 s):** chegada → confronto (grito e batidas no peito) → raios e câmera tremendo → "!" e fuga da onça → abraço → coração que cresce → **VITÓRIA!!! / FIM DE JOGO** → resultados.
- **Telas:** tela inicial com a capa (nome obrigatório, validado e lembrado), aviso rápido de controles ao entrar na fase (teclado: setas/WASD + ESPAÇO; celular: balões apontando para o joystick e o botão PULAR, que somem após alguns segundos ou após o primeiro pulo), pausa, configurações (volumes, mudo, qualidade gráfica, destaque do próximo cipó), Game Over, Vitória e Ranking Top 10.
- **Áudio sintetizado (Web Audio):** trilha tensa com variação 2X sincronizada no compasso, música de vitória, chuva, vento, trovões e todos os efeitos pedidos. Começa só após a primeira interação (regra de autoplay). Pode ser trocado por arquivos (ver `public/assets/audio/README.md`).
- **Mobile:** joystick analógico + botão de pulo com multitoque, sem rolagem/zoom acidental, aviso para girar o aparelho, interface adaptada a telas baixas e qualidade gráfica automática.

---

## Arquitetura

```text
src/
├── core/                 # LÓGICA PURA (sem Phaser): usada pelo jogo, pelos testes e pela Cloud Function
│   ├── constants.js        física, durações, quantidades, versão da fase
│   ├── vinePhysics.js      pêndulo dos cipós livres (amplitude regulada)
│   ├── monkeySim.js        chão / ar / cipó, captura, soltura, morte
│   ├── reachability.js     verificador de alcance entre cipós
│   ├── levelGenerator.js   6 trechos + distribuição de itens por semente
│   ├── autoPilot.js        "robô" (testes)
│   ├── scoring.js          pontuação, bônus, ordenação do ranking
│   ├── powerUpTimers.js    7 s, rampas suaves, música 2X
│   ├── validation.js       nome do jogador e validação de resultados
│   └── rng.js              PRNG determinístico (mulberry32)
├── entities/             # Monkey, SpriteActor (quadros PNG), MonkeyStateMachine,
│                         # Vine, Banana, PowerUp, Jaguar, Companion
├── systems/              # AudioManager, TextureFactory, ParallaxBackground, WeatherSystem,
│                         # LevelRenderer, CameraController, CollectibleSystem, PowerUpSystem,
│                         # ScoreSystem, InputManager, VictoryCutscene
├── scenes/               # Boot, Menu, Game, GameOver, Victory, Ranking,
│                         # LayerScene (BgLayer/FxLayer), flow.js (transições)
├── ui/                   # HUD, VirtualJoystick, telas HTML (screens.js), dom.js
├── services/             # firebase.js (carregado só se configurado), rankingService.js, storage.js
└── styles/main.css
functions/                # Cloud Functions (startRun, submitRun)
scripts/                  # build-sprites.mjs, generate-art.mjs, optimize-assets.mjs, sync-functions.mjs
tests/                    # Vitest
assets/                   # artes de referência originais (fonte)
public/assets/            # versões otimizadas usadas pelo jogo
```

**Camadas de desenho:** a cena `BgLayer` (céu e paralaxe) fica atrás do mundo, e a `FxLayer` (chuva, clarões, vinheta, textos de tela) fica na frente. Assim a câmera do mundo pode dar zoom (celular, cena final) sem distorcer o que é desenhado em coordenadas de tela.

### Arte (tudo em PNGs separados, fácil de trocar)

Toda a arte que o jogo carrega fica em `public/assets/`, **um PNG por peça**. Para trocar, substitua o arquivo mantendo o nome. O tamanho da imagem não importa: o jogo escala sozinho.

| Pasta / arquivo | O que é | De onde vem |
|---|---|---|
| `ui/cover.jpg` | Tela inicial | `assets/capa_monkey_fast.png` |
| `characters/monkey/*.png` | Quadros do macaco (andar, agachar, voar, mergulhar...) | recortados de `assets/movimentação_personagem_principal.png` |
| `characters/monkey/jump.png` | Pulo / pendurado no cipó | `assets/Gorila Herói em Salto Dinâmico.png` |
| `characters/companion/*.png` | Quadros da macaca (parada, andando, assustada, feliz) | recortados de `assets/macaca_femea_a_ser_resgatada.png` |
| `characters/jaguar/climb_*.png`, `turn_*.png` | Onça escalando e virando de costas (fuga) | recortados de `assets/movimentação_jaguar.png` |
| `characters/jaguar/roar.png` | Onça rugindo | `assets/jaguar.png` |
| `environment/vine/normal_*.png` | Cipó normal (8 quadros de movimento) | `assets/cipo_nnormal_movimentos.png` |
| `environment/vine/magic_*.png` | Cipó mágico da Goiaba (8 quadros, + brilho neon no jogo) | `assets/cipo_magico-movimentos.png` |
| `environment/tree_start.png` / `tree_final.png` | Árvore do ponto de partida e árvore final | sua arte |
| `environment/canopy_0..3.png` | Copas que seguram os cipós | sua arte |
| `environment/trunk.png` | Tronco (repete na vertical) | sua arte |
| `environment/sky.png`, `mountains.png`, `jungle_far.png`, `jungle_mid.png`, `foreground.png` | Camadas da paralaxe (repetem na horizontal) | sua arte |
| `collectibles/*.png` | Banana, manga, goiaba | suas artes, redimensionadas |
| `art.json` | **Medidas do cenário** (topo do galho, tronco, largura das copas...) | editado à mão |
| `sprites.json` | Lista de quadros, pontos de apoio e escalas | gerado por `npm run sprites` |

**Trocou a árvore de início/fim por outra com enquadramento diferente?** Abra `public/assets/art.json` e ajuste, em pixels da sua imagem, `branchTopY` (altura do topo do galho), `branchX1`/`branchX2` (trecho do galho onde se anda) e `trunkX1`/`trunkX2` (largura do tronco na borda de baixo). O resto o jogo faz sozinho ao carregar:
- esconde a emenda das imagens que se repetem (céu, camadas, primeiro plano e tronco), misturando as bordas;
- faz a base das árvores sumir em degradê para o tronco continuar para baixo;
- mede em cada copa onde o cipó deve se prender.

A grossura dos cipós fica em `WIDTH` no topo de `src/entities/Vine.js` (1 = largura original da arte; hoje 0,5).

Scripts:

```bash
npm run sprites   # recorta as folhas de /assets em quadros + capa (scripts/build-sprites.mjs)
npm run art       # cria copas/tronco/camadas cartoon SÓ se o PNG não existir (scripts/generate-art.mjs)
npm run assets    # tudo acima + colecionáveis e retratos
```

Os scripts **não** apagam as artes de cenário que você colocou em `public/assets/environment` (`npm run art -- --force` recria tudo, apagando as suas). `npm run sprites` refaz os quadros dos personagens a partir das folhas de `/assets`.

O recorte dos quadros é automático (pela transparência). Se você refizer uma folha de animação com outra disposição, ajuste as caixas em `scripts/build-sprites.mjs` (`MONKEY_BOXES`, `FEMALE_ROWS` e o corte da onça em `buildJaguar`).

### Ajuste de dificuldade

Tamanhos dos cipós: `VINE_SIZES` e a proporção de curtos/médios/longos por trecho (`sizes`) em `src/core/levelGenerator.js`.

Os parâmetros de cada trecho (distância, altura, comprimento, amplitude e velocidade dos cipós, folga mínima de tempo para soltar) ficam em `SECTION_PARAMS` (`src/core/levelGenerator.js`), e a física fica em `src/core/constants.js`. Depois de qualquer mudança, rode `npm test`: o verificador e o robô confirmam que a fase continua atravessável. Se mudar o layout, **altere `LEVEL_VERSION`** para não misturar rankings de versões diferentes.

---

## Firebase: ranking global e publicação

### 1. Criar o projeto

1. Crie um projeto no [Console do Firebase](https://console.firebase.google.com/) e adicione um **app Web**.
2. Ative **Authentication → Método de login → Anônimo**.
3. Crie o **Cloud Firestore** (modo produção).
4. Cloud Functions exige o plano **Blaze** (pago conforme o uso, com cota gratuita).
5. (Recomendado) Ative o **App Check** com reCAPTCHA v3 e coloque a chave do site em `VITE_FIREBASE_APPCHECK_SITE_KEY`.

### 2. Configurar o projeto local

```bash
npm install -g firebase-tools
firebase login
cp .firebaserc.example .firebaserc     # coloque o ID do seu projeto
cp .env.example .env.local             # preencha com a config do app Web
cd functions && npm install && cd ..
```

Os valores `VITE_FIREBASE_*` identificam o projeto e não são segredos. A segurança vem das regras do Firestore e da validação nas Functions. Nenhum segredo fica no código.

### 3. Testar com emuladores (opcional)

```bash
# em .env.local: VITE_USE_FIREBASE_EMULATORS=true
npm run emulators      # Auth, Firestore, Functions e Hosting locais
npm run dev
```

### 4. Publicar

```bash
npm run deploy         # = firebase deploy (faz build do jogo e copia src/core para as functions)
```

Isso publica o Hosting (pasta `dist/`), as regras e índices do Firestore e as Cloud Functions.

### Segurança do ranking (o que existe e o que não existe)

- O navegador **não consegue escrever** na coleção `scores` (`firestore.rules`). Só a função `submitRun` grava.
- `startRun` gera a semente no servidor e registra o horário de início. `submitRun` exige o mesmo usuário (anônimo), usa cada partida uma única vez, **regenera a fase pela semente**, confere cada banana e power-up enviados, **recalcula a pontuação** (ignora a do cliente), rejeita tempo menor que o fisicamente possível ou maior que o medido pelo servidor, confere a ordem dos eventos (agarres e coletas no trecho certo) e limita a frequência por usuário.
- **Limitação:** não há replay determinístico completo da partida. Um cliente modificado ainda pode forjar uma partida "plausível". Isso **não é** uma proteção antifraude completa. O próximo passo seria registrar as entradas por passo de física e re-simular a partida no servidor (o núcleo `src/core` já é puro e determinístico, o que facilita).
- Só partidas **vencidas** são enviadas ao ranking. Sem Firebase, ou se o envio falhar, o resultado fica no ranking local.

---

## Testes automatizados

`npm test` executa 59 testes:

- **Pontuação:** exemplo do GDD (100 + 4 → 312), sem bônus quando falta item, ordenação por pontos e tempo.
- **Power-ups:** duração exata de 7 s, rampas suaves, os dois juntos, música 2X sem multiplicar, independência de FPS.
- **Física:** amplitude dos cipós, independência de FPS, captura sem teletransporte, captura em alta velocidade, impulso preservado, sem reagarre imediato, morte sem chão invisível, subir/descer nos limites.
- **Fase:** 80–100 cipós, 6 trechos na ordem certa, determinismo, todos os saltos verificados duas vezes, 100/2/2 itens para qualquer semente, sem sobreposição.
- **Coleta integral:** sete sementes (incluindo 0 e 4294967295) com coleta das 100 bananas e dos quatro power-ups, vitória e resultado de 312 pontos validado pelo servidor.
- **Ranking por versão:** a distribuição v3 não mistura resultados anteriores.
- **Travessia completa:** o robô vai do galho inicial ao final com física real (normal, com goiaba e com manga).
- **Validação do servidor:** nomes, itens falsos ou repetidos, tempos impossíveis, versão errada, eventos incoerentes.

## Modo de teste (somente em `npm run dev`)

- `http://localhost:5173/?vine=88` começa agarrado no cipó 88 (perto do final).
- `&autoplay=1` faz o robô jogar sozinho (útil para ver a cena final).

Esses parâmetros não existem no build de produção.

## Pendências e próximos passos

- Mais quadros para o macaco pendurado/balançando no cipó (hoje usa o quadro do salto com o punho para cima) e para a cena final (grito, batida no peito, abraço).
- Sons e músicas gravados (hoje são sintetizados).
- Testar o desempenho em celulares reais de entrada (só foi testado em emulação de tela de celular).
- Ajuste fino de dificuldade com jogadores reais.
- Antifraude por replay determinístico (ver acima).
- O ranking global só foi validado com código e testes locais: ainda não foi publicado num projeto Firebase real.

### Diagnóstico de coleta

`node scripts/audit-collectibles.mjs 1 42 2026` compara a rota do robô com e sem os efeitos dos power-ups. A coleta integral é certificada com os efeitos habilitados, como na partida real; desabilitá-los muda as trajetórias. A rota é pré-calculada em `src/core/certifiedRoute.js`: nenhuma simulação do robô é executada ao clicar em Jogar. Após alterar o layout ou a física, execute `node scripts/certify-route.mjs` e os testes de coleta antes de publicar.

