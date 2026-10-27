# PROJETO: MONKEY FAST — JOGO 2D SIDE-SCROLLER

Você é um desenvolvedor sênior de jogos web, especializado em JavaScript, Phaser 3, física de jogos 2D, animações, efeitos visuais, interfaces responsivas, áudio e Firebase.

Sua missão é **criar um jogo completo e jogável chamado MONKEY FAST**, utilizando HTML5, CSS3, JavaScript e Phaser 3, com Vite para desenvolvimento e build.

O jogo será executado em navegadores desktop e dispositivos mobile, posteriormente hospedado no Firebase Hosting.

**IMPORTANTE:** Não quero apenas um protótipo estático ou uma interface simulada. Quero um jogo funcional, com movimentação, colisões, física, cenários, efeitos, progressão, pontuação, vitória e derrota.

Se o projeto já possuir arquivos, examine-os antes de alterar qualquer coisa. Preserve o que já estiver funcionando.

Crie uma arquitetura organizada, modular, documentada e fácil de expandir.

---

# 1. HISTÓRIA DO JOGO

Monkey Fast conta a história de um jovem chimpanzé que precisa atravessar uma floresta tropical durante uma forte tempestade para salvar sua amada.

Sua companheira está encurralada no topo de uma árvore gigantesca, enquanto uma onça tenta escalar o tronco para atacá-la.

O chimpanzé precisa alcançar a árvore o mais rápido possível, saltando de cipó em cipó, atravessando árvores enormes e enfrentando alturas perigosas.

O jogo deve transmitir:

- Urgência e perigo.
- Velocidade e adrenalina.
- Necessidade de reflexos e precisão.
- Uma atmosfera cinematográfica de aventura.
- Satisfação por dominar saltos difíceis.

A principal dificuldade está em calcular o momento certo para saltar entre cipós que se movimentam constantemente.

O jogador possui apenas uma vida. Se cair, o jogo termina.

---

# 2. ESTILO GRÁFICO

O jogo será um **2D Side-Scroller com estética cartoon detalhada, animações fluidas e atmosfera cinematográfica**.

O cenário será uma floresta tropical escura, durante a noite, com chuva intensa.

Elementos obrigatórios:

- Árvores gigantescas.
- Cipós pendurados em galhos.
- Vegetação tropical abundante.
- Floresta distante em diferentes profundidades.
- Névoa.
- Chuva animada.
- Nuvens carregadas.
- Relâmpagos ocasionais.
- Partículas de folhas transportadas pelo vento.
- Sombras dinâmicas.
- Iluminação atmosférica.
- Efeitos visuais de velocidade.

Utilizar PARALLAX com múltiplas camadas independentes:

1. Céu noturno e nuvens.
2. Montanhas e silhuetas distantes da floresta.
3. Árvores distantes.
4. Árvores intermediárias.
5. Árvores próximas e galhos.
6. Cipós interativos.
7. Chuva e partículas em primeiro plano.

O paralaxe deve responder à movimentação horizontal e vertical da câmera.

Os relâmpagos devem iluminar temporariamente o cenário.

O jogo precisa manter bom desempenho, principalmente em celulares.

Caso não existam assets gráficos, crie gráficos provisórios utilizando os recursos do Phaser, Canvas ou SVG. Esses elementos devem ser visualmente identificáveis, animados e substituíveis futuramente por sprites PNG.

Não deixe o jogo impossível de executar por falta de imagens ou áudios externos.

---

# 3. PERSONAGEM PRINCIPAL

O protagonista é um chimpanzé jovem, ágil, expressivo e corajoso.

Ele deve possuir animações distintas:

- Idle (parado).
- Caminhando.
- Correndo.
- Preparando salto.
- Saltando.
- Braços estendidos tentando alcançar o cipó.
- Agarrando o cipó.
- Balançando no cipó.
- Subindo pelo cipó.
- Descendo pelo cipó.
- Soltando o cipó.
- Queda livre.
- Desespero durante a queda.
- Morte/Game Over.
- Coletando bananas.
- Coletando power-ups.
- Correndo com velocidade aumentada.
- Recebendo eletricidade.
- Gritando.
- Batendo no peito.
- Abraçando sua companheira.

Utilize uma máquina de estados para controlar as animações e evitar conflitos.

O personagem deverá virar automaticamente na direção do movimento.

---

# 4. MECÂNICA PRINCIPAL — CIPÓS

ESTA É A MECÂNICA MAIS IMPORTANTE DO JOGO.

Os cipós são cordas vegetais penduradas nos galhos das árvores e devem balançar constantemente de um lado para o outro.

Implemente uma física baseada em movimento pendular, levando em consideração:

- Comprimento do cipó.
- Ângulo atual.
- Velocidade angular.
- Gravidade.
- Impulso.
- Oscilação.
- Posição do personagem.
- Momento de soltura.
- Trajetória do salto.

O chimpanzé inicia em uma plataforma representada por um grande galho de árvore.

Ao pular em direção a um cipó, deve conseguir agarrá-lo automaticamente quando estiver dentro de uma distância de captura válida.

Quando agarrado:

- O personagem acompanha o movimento pendular.
- As setas esquerda/direita ou A/D ajudam a impulsionar o balanço.
- As setas cima/baixo ou W/S permitem subir e descer pelo cipó.
- O personagem deve permanecer visualmente preso ao ponto correto do cipó.
- A animação deve mostrar os braços segurando o cipó.

Quando o jogador pressiona ESPAÇO:

- O chimpanzé se solta.
- Recebe impulso conforme o movimento do cipó.
- Mantém a velocidade apropriada de lançamento.
- Passa para um movimento de salto com gravidade.
- Pode agarrar outro cipó durante a trajetória.

O momento de soltura é fundamental.

Se o jogador se soltar no momento correto, poderá alcançar uma distância maior.

Se pular cedo ou tarde demais, poderá errar o próximo cipó e cair.

Não permita que o personagem volte a se agarrar instantaneamente ao mesmo cipó após soltá-lo.

Os cipós devem ter comprimentos e posições variados.

Durante o desenvolvimento, verifique matematicamente se os saltos entre cipós são possíveis, incluindo situações de subida, descida e deslocamento diagonal.

Evite problemas como:

- Atravessar o cipó sem agarrá-lo.
- Teletransportar o personagem ao capturar um cipó.
- Perder a colisão em altas velocidades.
- Personagem ficar preso em um estado de animação.
- Saltos impossíveis.
- Movimentos excessivamente bruscos.
- Inconsistências na física com diferentes taxas de FPS.

---

# 5. ESTRUTURA COMPLETA DA FASE

O jogo terá inicialmente uma fase longa, contínua, com aproximadamente 80 a 100 cipós, podendo ajustar a quantidade conforme os testes de dificuldade e desempenho.

Não quero pequenas plataformas tradicionais espalhadas pelo cenário.

O percurso acontecerá principalmente através de cipós suspensos sobre um grande vazio.

A fase deverá ter esta sequência obrigatória:

## TRECHO 1 — HORIZONTAL

O macaco parte de um grande galho.

Avança da esquerda para a direita, pulando entre cipós.

Este trecho apresenta a mecânica ao jogador.

Cipós próximos e dificuldade inicial moderada.

## TRECHO 2 — SUBIDA VERTICAL

O percurso começa a subir.

O chimpanzé precisa alcançar cipós progressivamente mais altos.

A câmera deve acompanhar o personagem verticalmente.

A dificuldade aumenta porque o jogador precisa aproveitar o impulso para ganhar altura.

## TRECHO 3 — HORIZONTAL ELEVADO

Nova sequência horizontal entre as copas das árvores.

Os cipós passam a ter diferentes comprimentos, velocidades e distâncias.

## TRECHO 4 — DESCIDA VERTICAL

O jogador começa a descer através de cipós em diferentes alturas.

A câmera acompanha a descida.

O jogador precisa controlar a velocidade da queda e a direção dos saltos.

## TRECHO 5 — NOVA TRAVESSIA HORIZONTAL

Longo trecho horizontal, com maior dificuldade e cipós mais distantes.

Intensificar a sensação de perigo e velocidade.

## TRECHO 6 — SUBIDA DIAGONAL FINAL

O percurso sobe progressivamente na diagonal.

É a parte mais desafiadora da fase.

Os cipós devem exigir precisão e domínio da mecânica.

Ao final, o personagem precisa executar um grande salto até um galho da árvore mais alta da floresta.

Nesse local estará sua companheira, ameaçada por uma onça.

A fase termina quando o macaco alcançar essa plataforma final.

**IMPORTANTE:** A fase deve existir em um mundo maior do que a tela visível. A câmera seguirá o jogador de maneira suave, sem revelar todo o percurso de uma vez.

Não crie chão invisível sob o personagem.

Cair para fora de uma área recuperável significa Game Over.

---

# 6. CONTROLES

## DESKTOP

- A ou seta esquerda: movimentar para a esquerda.
- D ou seta direita: movimentar para a direita.
- W ou seta cima: subir pelo cipó.
- S ou seta baixo: descer pelo cipó.
- Espaço: pular, soltar o cipó ou saltar para outro.
- ESC: pausar.

## MOBILE E TABLET

Criar controles virtuais responsivos:

- Joystick analógico no canto inferior esquerdo.
- Botão de salto no canto inferior direito.
- Botão de pausa no canto superior.
- Feedback visual ao tocar nos botões.

Os controles devem aceitar múltiplos toques simultâneos.

Evitar que o navegador role a página ou selecione elementos durante o jogo.

O jogo deve funcionar preferencialmente na orientação horizontal (landscape).

Adaptar resolução, interface, zoom e controles para diferentes tamanhos de tela.

---

# 7. SISTEMA DE VIDA E GAME OVER

O jogador possui somente UMA VIDA.

Se cair no vazio:

1. Executar animação de queda.
2. Tocar efeito sonoro de queda ou derrota.
3. A câmera acompanha brevemente a queda.
4. Encerrar a partida.
5. Exibir uma tela de GAME OVER.

Mostrar:

- Nome do jogador.
- Tempo sobrevivido.
- Bananas coletadas.
- Power-ups coletados.
- Pontuação alcançada.

Disponibilizar:

- Tentar novamente.
- Menu principal.

Não haverá checkpoints nesta primeira versão.

O jogador recomeça a fase do início.

---

# 8. BANANAS COLECIONÁVEIS

Distribuir bananas durante todo o percurso da fase.

Cada banana coletada concede:

**+1 PONTO.**

As bananas devem:

- Ter formato de banana dourada.
- Possuir brilho sutil.
- Apresentar animação de flutuação.
- Possuir efeito de coleta.
- Tocar um som específico.
- Desaparecer corretamente após a coleta.
- Atualizar a pontuação imediatamente.

As bananas devem aparecer principalmente nos espaços entre cipós, recompensando saltos bem executados.

Não posicionar bananas dentro de obstáculos ou em trajetórias impossíveis.

---

# 9. POWER-UP — MANGA MÁGICA

Criar um item especial chamado MANGA MÁGICA.

Quantidade máxima:

**2 mangas por fase.**

Duração:

**7 segundos.**

Quando o jogador coleta uma manga:

- O chimpanzé recebe um aumento perceptível na velocidade de movimentação.
- O impulso dos saltos poderá aumentar de forma balanceada.
- Surgem partículas elétricas ao redor de seu corpo.
- Seus olhos brilham como relâmpagos.
- Rastros elétricos acompanham seus movimentos.
- A animação do personagem demonstra maior agilidade.
- Um contador visual mostra o tempo restante.

A música acelera para uma versão com sensação de velocidade 2X.

Os efeitos ambientais e o paralaxe também aumentam sua intensidade e velocidade visual.

Criar um som especial de ativação elétrica.

Após sete segundos, o personagem retorna gradualmente à velocidade normal.

A mudança de velocidade não deve provocar teletransportes, perda de colisões ou saltos descontrolados.

---

# 10. POWER-UP — GOIABA MÁGICA

Criar um segundo item chamado GOIABA MÁGICA.

Quantidade máxima:

**2 goiabas por fase.**

Duração:

**7 segundos.**

Quando o jogador coleta uma goiaba:

- Os cipós passam da cor verde para roxo mágico.
- Surgem partículas e pequenas distorções temporais.
- Os cipós balançam mais rapidamente.
- A velocidade angular de oscilação aumenta.
- O cenário apresenta efeitos temporários de distorção.
- Um contador visual mostra o tempo restante.

A música passa a transmitir velocidade 2X.

O paralaxe, a chuva e os efeitos visuais também aceleram.

Criar um som mágico específico para esse power-up.

Após sete segundos, os cipós retornam à cor verde e ao movimento normal, realizando transições suaves.

Evitar movimentos instantâneos que prejudiquem a física.

Os dois power-ups podem ser ativados simultaneamente, mantendo seus efeitos próprios.

Não multiplicar a velocidade da música repetidamente.

Quando ambos estiverem ativos, manter apenas a aceleração musical 2X.

---

# 11. DISTRIBUIÇÃO DOS ITENS

As bananas e os power-ups deverão ser distribuídos ao longo da fase.

Os itens devem aparecer nos espaços de salto entre cipós.

Utilizar distribuição pseudoaleatória baseada em uma semente (seed), respeitando posições válidas e alcançáveis.

Isso permite variar a distribuição sem favorecer ou prejudicar injustamente jogadores no ranking.

Regras:

- Máximo de 2 mangas.
- Máximo de 2 goiabas.
- As bananas ficam distribuídas por toda a fase.
- Evitar sobreposição entre objetos.
- Evitar itens impossíveis de coletar.
- Garantir que todos os itens possam ser alcançados.

Todos os itens planejados para a partida precisam ser contabilizados pelo sistema de pontuação.

---

# 12. BÔNUS POR PARTIDA PERFEITA

Se o jogador conseguir chegar ao final coletando TODAS as bananas e TODOS os power-ups da fase, receberá um bônus especial.

Cada banana vale 1 ponto.

Cada power-up coletado também contará como 1 ponto para a pontuação básica.

A fórmula será:

**Pontos básicos = bananas coletadas + power-ups coletados.**

Se coletar absolutamente tudo:

**Bônus perfeito = pontos básicos × 2.**

**Pontuação final = pontos básicos + bônus perfeito.**

Exemplo:

- 100 bananas: 100 pontos.
- 4 power-ups: 4 pontos.
- Pontuação básica: 104.
- Bônus perfeito: 208.
- Total final: 312 pontos.

Exibir uma animação de destaque para o bônus perfeito, com partículas, som de conquista e mensagem:

**PERFECT RUN!**

Caso não colete todos os itens, recebe apenas a pontuação básica.

O tempo influencia o desempate do ranking, não a quantidade de pontos.

---

# 13. INTERFACE DURANTE O JOGO

Criar HUD discreto, bonito e legível.

Mostrar:

- Nome do jogador.
- Pontuação atual.
- Quantidade de bananas coletadas.
- Cronômetro da partida.
- Ícone do power-up ativo.
- Tempo restante do efeito.
- Botão de pausa.
- Indicador discreto de progresso da fase.

Os elementos não podem obstruir os cipós ou dificultar a visão dos próximos saltos.

No celular, utilizar tamanhos apropriados para leitura e toque.

---

# 14. TRILHA SONORA E EFEITOS

O jogo precisa transmitir uma atmosfera de filme de ação e aventura.

Criar uma estrutura de gerenciamento de áudio.

Sons necessários:

- Música de fundo tensa e cinematográfica.
- Chuva.
- Trovões.
- Vento.
- Passos no galho.
- Salto.
- Agarrar cipó.
- Balanço.
- Soltar cipó.
- Queda.
- Game Over.
- Coleta de banana.
- Coleta de manga mágica.
- Coleta de goiaba mágica.
- Eletricidade.
- Distorção temporal.
- Grito do chimpanzé.
- Batidas no peito.
- Rugido da onça.
- Onça assustada.
- Abraço e vitória.

Não utilizar músicas comerciais ou materiais protegidos sem autorização.

Caso os áudios definitivos não estejam disponíveis, implemente um sistema funcional com sons provisórios sintetizados ou arquivos livres devidamente licenciados.

Organize o projeto de forma que os arquivos possam ser substituídos facilmente.

Durante os power-ups, a música deve acelerar 2X, preferencialmente por meio de uma variação sincronizada da trilha.

O áudio deve respeitar as restrições de autoplay dos navegadores, começando após interação do jogador.

Disponibilizar configurações de volume, efeitos e opção de silenciar.

---

# 15. TELA INICIAL

Criar uma tela de menu principal com a identidade visual MONKEY FAST.

Elementos:

- Título grande e estilizado.
- Cenário de floresta escura animada.
- Chuva e relâmpagos.
- Chimpanzé em destaque.
- Campo para digitar o nome do jogador.
- Botão JOGAR.
- Botão RANKING.
- Botão COMO JOGAR.
- Botão CONFIGURAÇÕES.

O nome do jogador deve ser obrigatório para iniciar.

Validar comprimento e caracteres permitidos.

Salvar localmente o último nome utilizado para facilitar novas partidas.

A interface deve possuir animações suaves, feedback sonoro e boa aparência em desktop e mobile.

---

# 16. TUTORIAL INTERATIVO

Antes de iniciar a fase, apresentar uma explicação visual e intuitiva de como jogar.

Evitar excesso de texto.

Mostrar:

1. Como andar.
2. Como pular.
3. Como agarrar um cipó.
4. Como se balançar.
5. Como subir e descer pelo cipó.
6. Como calcular o momento de soltura.
7. Como pegar bananas.
8. O que fazem a manga e a goiaba mágicas.
9. O perigo de cair.
10. O objetivo de salvar a companheira.

Utilizar animações demonstrativas, ícones e pequenos textos.

Na primeira partida, apresentar o tutorial automaticamente.

Nas próximas partidas, permitir que seja pulado.

---

# 17. RANKING GLOBAL FIREBASE

Implementar ranking global utilizando Firebase.

Tecnologias recomendadas:

- Firebase Hosting.
- Cloud Firestore.
- Firebase Authentication anônima, quando necessário.
- Cloud Functions para registro e validação dos resultados.

O ranking deve mostrar os 10 melhores jogadores.

Campos necessários:

- Nome do jogador.
- Pontuação final.
- Tempo de conclusão.
- Quantidade de bananas.
- Quantidade de power-ups.
- Bônus perfeito.
- Data da partida.
- Versão da fase.

Ordenação:

**1º: maior pontuação.**

**2º: menor tempo de conclusão, em caso de empate.**

Somente partidas concluídas com vitória devem entrar no ranking global.

Criar uma tabela visual com as posições de 1 a 10, destacando os três primeiros colocados.

O jogador deverá conseguir acessar o ranking pela tela inicial e após vencer.

Utilizar medidas de segurança contra falsificação de pontuação.

Não permitir escrita direta e irrestrita de pontuação no Firestore a partir do navegador.

Encaminhar resultados a uma função de backend e aplicar validações. Quando possível, usar registro de eventos/replay determinístico para validar a partida.

Não declarar proteção antifraude completa se ela não estiver implementada.

Se ainda não houver credenciais Firebase, manter o jogo funcionando offline com ranking local provisório.

Criar arquivo `.env.example`, configuração Firebase e documentação de conexão e publicação, sem inserir segredos privados no código.

---

# 18. CENA FINAL — RESGATE E VITÓRIA

Quando o chimpanzé alcançar o galho da árvore mais alta, iniciar automaticamente uma sequência cinematográfica.

Desativar temporariamente os controles do jogador.

A sequência deverá acontecer nesta ordem:

**CENA 1 — CHEGADA**

O chimpanzé aterrissa no galho.

A câmera acompanha sua chegada.

Sua companheira está assustada.

A onça está tentando subir pela árvore.

**CENA 2 — CONFRONTO**

O macaco percebe a onça.

Ele se posiciona de frente para o animal.

Executa uma animação de gritar e bater repetidamente no peito.

Tocar sons graves e ameaçadores.

**CENA 3 — TEMPESTADE**

Grandes relâmpagos iluminam a floresta.

A câmera treme levemente.

O chimpanzé continua gritando.

**CENA 4 — A ONÇA SE ASSUSTA**

Surge uma exclamação acima da cabeça da onça.

Ela apresenta uma animação exagerada de surpresa.

A onça se solta da árvore e salta para longe, desaparecendo na floresta.

**CENA 5 — REENCONTRO**

A companheira corre até o chimpanzé.

Os dois se abraçam.

A música muda para uma melodia emocionante de vitória.

**CENA 6 — ENCERRAMENTO**

Um pequeno coração aparece acima das cabeças dos dois.

O coração começa a subir e crescer.

Quando ocupar grande parte da tela, exibir:

**VITÓRIA!!!**

**FIM DE JOGO**

Depois, apresentar:

- Nome do jogador.
- Tempo final.
- Total de bananas.
- Total de power-ups.
- Bônus perfeito, caso obtido.
- Pontuação total.
- Posição no ranking, se disponível.

Disponibilizar botões:

- Jogar novamente.
- Ver ranking.
- Menu principal.

A sequência cinematográfica deve durar aproximadamente 10 a 15 segundos, com animações e transições suaves.

---

# 19. ARQUITETURA DO PROJETO

Utilizar Phaser 3 com JavaScript moderno e Vite.

Organizar o código em módulos.

Sugestão de estrutura:

```text
monkey-fast/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── firebase.json
├── firestore.rules
├── src/
│   ├── main.js
│   ├── config/
│   │   └── gameConfig.js
│   ├── scenes/
│   │   ├── BootScene.js
│   │   ├── MenuScene.js
│   │   ├── TutorialScene.js
│   │   ├── GameScene.js
│   │   ├── GameOverScene.js
│   │   ├── VictoryScene.js
│   │   └── RankingScene.js
│   ├── entities/
│   │   ├── Monkey.js
│   │   ├── Vine.js
│   │   ├── Banana.js
│   │   ├── PowerUp.js
│   │   └── Jaguar.js
│   ├── systems/
│   │   ├── VinePhysics.js
│   │   ├── LevelGenerator.js
│   │   ├── CameraController.js
│   │   ├── CollectibleSystem.js
│   │   ├── PowerUpSystem.js
│   │   ├── ScoreSystem.js
│   │   ├── AudioManager.js
│   │   ├── InputManager.js
│   │   └── WeatherSystem.js
│   ├── ui/
│   │   ├── HUD.js
│   │   └── VirtualJoystick.js
│   ├── services/
│   │   ├── firebase.js
│   │   └── rankingService.js
│   └── styles/
│       └── main.css
├── public/
│   └── assets/
│       ├── characters/
│       ├── environment/
│       ├── collectibles/
│       ├── effects/
│       ├── audio/
│       └── ui/
├── functions/
├── tests/
└── README.md
```

A estrutura pode ser adaptada caso exista uma organização tecnicamente superior.

Evitar colocar todas as funcionalidades em um único arquivo JavaScript.

Separar claramente:

- Física.
- Renderização.
- Colisões.
- Estado do personagem.
- Movimentação.
- Geração da fase.
- Colecionáveis.
- Áudio.
- Interface.
- Firebase.
- Animações.

---

# 20. DESEMPENHO E QUALIDADE

O jogo deve buscar 60 FPS em computadores e celulares compatíveis.

Implementar:

- Uso eficiente de sprites.
- Reaproveitamento de partículas.
- Descarte correto de objetos.
- Otimização de colisões.
- Renderização apenas do necessário.
- Controle do consumo de memória.
- Física independente de variações de FPS.
- Adaptação de qualidade gráfica em aparelhos menos potentes.
- Suporte a redimensionamento da janela.
- Preservação da escala e proporções do jogo.

Não permitir que o cronômetro continue avançando durante uma pausa.

Limpar timers e eventos ao reiniciar uma cena.

Evitar vazamentos de memória.

---

# 21. EXPERIÊNCIA DO JOGADOR

A dificuldade precisa aumentar progressivamente.

O jogo deve ser difícil, porém justo.

O jogador precisa sentir que errou pela escolha do momento de salto, e não por falhas de controle.

Adicionar feedback visual ao agarrar um cipó.

Permitir que o jogador identifique visualmente a próxima possibilidade de salto sem tornar a experiência fácil demais.

A câmera deve antecipar levemente a direção do movimento.

Durante quedas perigosas, adicionar uma reação visual de desespero.

Os efeitos visuais não podem comprometer a leitura dos cipós e a precisão do movimento.

---

# 22. PROCESSO DE IMPLEMENTAÇÃO

Trabalhe diretamente nos arquivos do projeto.

Não se limite a explicar como o jogo poderia ser feito.

Implemente de verdade.

Execute o trabalho nesta ordem:

**ETAPA 1 — BASE**

Criar projeto Vite + Phaser 3, cenas iniciais, estrutura de pastas, tela de menu e personagem controlável.

**ETAPA 2 — MECÂNICA**

Implementar física dos cipós, captura, balanço, subida, descida, saltos e queda.

Testar primeiro uma sequência curta de cipós.

**ETAPA 3 — FASE COMPLETA**

Criar a fase longa com os seis trechos obrigatórios, câmera bidimensional, dificuldade progressiva e verificação de saltos alcançáveis.

**ETAPA 4 — CENÁRIO**

Adicionar floresta, chuva, névoa, raios e múltiplas camadas de paralaxe.

**ETAPA 5 — ITENS**

Adicionar bananas, manga mágica, goiaba mágica, efeitos, temporizadores e pontuação.

**ETAPA 6 — INTERFACE**

Criar HUD, controles touch, tutorial, pausa e Game Over.

**ETAPA 7 — ÁUDIO E ANIMAÇÕES**

Adicionar trilha, efeitos sonoros, animações do personagem e feedback de coleta.

**ETAPA 8 — VITÓRIA**

Implementar toda a sequência de resgate, onça assustada, abraço e coração.

**ETAPA 9 — FIREBASE**

Integrar ranking global, validar resultados, configurar regras de segurança e preparar hospedagem.

**ETAPA 10 — TESTES E ACABAMENTO**

Corrigir bugs, otimizar desempenho, testar em diferentes resoluções e documentar o projeto.

Conclua cada etapa de forma funcional antes de introduzir dependências adicionais.

Caso o trabalho completo ultrapasse a capacidade de uma única execução, priorize entregar código utilizável das etapas já concluídas, informando precisamente o que ainda falta, sem simular recursos inexistentes.

---

# 23. CRITÉRIOS DE ACEITAÇÃO

Antes de considerar o projeto concluído, verificar:

- O jogo inicia sem erros.
- O usuário consegue informar seu nome.
- O chimpanzé consegue caminhar e pular.
- Os cipós balançam.
- O jogador consegue agarrar e soltar cipós.
- Os saltos preservam o impulso do movimento.
- É possível atravessar toda a fase.
- A câmera acompanha subidas e descidas.
- Não existe chão invisível impedindo a derrota.
- Cair resulta em Game Over.
- As bananas podem ser coletadas.
- As mangas funcionam por sete segundos.
- As goiabas funcionam por sete segundos.
- Os efeitos de power-up terminam corretamente.
- A pontuação é calculada corretamente.
- O bônus perfeito é concedido apenas com coleta integral.
- O tutorial funciona.
- Os controles mobile funcionam.
- A cena final é reproduzida.
- O ranking funciona localmente e possui integração preparada com Firebase.
- Os arquivos estão organizados.
- O projeto executa com `npm install` e `npm run dev`.
- O build de produção funciona com `npm run build`.

Executar testes automatizados nas regras que puderem ser testadas, especialmente pontuação, duração dos poderes, geração da fase e alcance entre cipós.

Não inventar resultados de testes que não foram executados.

---

# 24. RESULTADO ESPERADO

Quero um jogo **Monkey Fast funcional, divertido, visualmente atraente, com boa jogabilidade e preparado para publicação na web**.

Dê atenção especial a:

1. Física e diversão do balanço nos cipós.
2. Precisão e responsividade dos controles.
3. Atmosfera da floresta durante a tempestade.
4. Animações do chimpanzé.
5. Sensação de velocidade dos power-ups.
6. Progressão da dificuldade.
7. Cena cinematográfica de vitória.
8. Ranking global de pontuação e tempo.

Tome decisões técnicas quando necessário, mantendo fidelidade ao conceito descrito.

Documente como executar, configurar o Firebase e publicar o jogo.

**COMECE EXAMINANDO O PROJETO ATUAL E, EM SEGUIDA, IMPLEMENTE O JOGO MONKEY FAST PARA JOGAR EM UM NAVEGADOR WEB HOSPEDADO NO FIRE BASE AS IMAGENS E ASSETS DE EXEMPLO E INSPIRAÇÃO ESTÃO NA PASTA ASSETS.**
