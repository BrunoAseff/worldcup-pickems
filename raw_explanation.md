## SOFTWARE DE BOLAO EM FAMILIA
Vou fazer um software pra um Bolao da copa do mundo 2026.

Publico alvo: so minha familia, 4 pessoas.

### STACK
- O mais simples possivel, podemos ir de next js, mesmo, front e backend, simplezao. Typescript obviamente. Componentes do shadcn. React-dom e tailwind. Drizzle orm. Zod. pnpm.

Para as bandeiras, vamos de Flagpack.

Vou utilizar banco de dados Neon, pelo projeto que criei aqui no site, o banco esta em postgres 17.

Deploy vai ser feito na vercel e backend serverless mesmo pra ajudar na rapidez.

### Como vai funcionar?

Vai ser so eu e minha familia, portanto, nao precisa de criacao de conta, rec de senha, etc, eu irei inserir tudo manualmente no banco depois.

Quero separar em duas fases:
1. Fase de grupos
2.  Mata a mata

O mata a mata ficara bloqueado ate que termine a fase de grupos.

Sera possivel adicionar o placar dos jogo. 

Devemos monitorar horarios e datas, sera possivel alterar a aposta ate o horario de inicio do jogo, depois disso acabou.

### DESIGN

Sera bem simples, apenas light mode, um estilo meio "duolingo" sabe? Moderno, a cor principal pode ser um verde 

O mata a mata tem que ser bem legal, com o sistema de chaveamento certinho, com conexoes entre os jogos.

Sem animacoes muito longas. Sem gradientes em botoes ou fundos. 

### MINHAS REGRAS INEGOCIAVEIS

LINGUAGEM: UI sempre em portugues, codigo sempre em ingles.
DRY: evitar ao MAXIMO repeticao
YAGNI: escrever o minimo de codigo possivel para antigir o objetivo da tarefa
SIMPLIFICADE: codigo deve ser facil de entender
SEM COMENTARIOS: nunca adicionar docstrings ou comentarios no codigo
ERROR HANDLING: Erros sao retornados pro usuario com mensagens tratadas, nunca erro cru do backend
COMPONENTES: Sempre utilizar Shadn para componentes.
UTILIZACAO DE LIBS: Nao tente reinventar a roda, se precisar de uma lib, use.
PESQUISE DOCUMENTACAO: Nao assuma comportamentos, comandos, funcoes, pesquise a documentacao oficial das libs quando estiver em duvida!
AUTENTICACAO: Rotas do backend sao sempre autenticadas, sem rotas publicas, tudo deve passar pelo middleware de autenticacao corretamente com utilizacao de cookies ou jwt, o que for mais adequado.
COMPONETIZACAO: componentes devem ser pequenos, conter pouquissimas coisas, constantes e variaveis, funcoes utilitarias, tudo em pastas de constants/utils/types etc.
PADRONIZACAO: globals.css deve ter as variaveis, quer adicionar uma nova cor? coloque la primeiro.
REFERENCIAS: o que esta em references nao e "reproduza essa tela" e sim "olha como esse outro site fez o que estamos fazendo"
NEXT: next js se atualiza bastante e talvez seu ultimo entendimento sobre a lib esteja incorreto, e bom sempre pesquisar quando necessario
SHADCN: shadcn tambem e atualizado constantemente e pesquisar o docs e util para saber qual componente ideal utilizar em cada momento, ja que muitos deles sao similares (table/data table, dropdown/popover, input/input group, etc)

### SUGESTAO PARA SEPARACAO DE TAREFAS

1. **Setup inicial do projeto**
Configurar banco em docker para rodar localmente (em prod nao), baixar componentes do shadcn e suas variaveis/ dependecias e libs que serao necessarias para o projeto, adicionar makefile, adicionar comandos pra rodar, etc.

2. **Fazer busca por jogos e datas**
Apos pesquisar, nao encontrei nenhuma api gratuita para buscar jogos e datas da copa. Como o software nao ira escalar e, jogos da copa dificilmente mudam de data, a busca sera feita via curl/fetch de sites ou manualmente. Os dados coletados vao ser adicionados em arquivos .csv para facilitar atualizacao automatizada caso necessario. Utilizaremos seeders para ler esses arquivos e subir no banco, tanto local quanto prod.

Nomes das selecoes e seus grupos devem estar normalizados no banco de dados. No desenvolvimento, algumas selecoes nao vao estar definidas porque algumas repescagens ainda estao acontecendo, deve ser possivel rodar o seeder de selecoes novamente em uma nova atualizacao e, todo o restante syncar automaticamente, ja estar colocado nos grupos e nas datas adequadas.

Independente da tabela criada, deve ter created_at, updated_at e id (uuidv4)

Update: Consegui extrair as infos que precisamos, esta tudo em copa_do_mundo_2026.csv.

Obviamente, nao e so colocar em uma tabela os dados, eles precisam ser normalizados, colocados em ingles, separados adequadamente, timestamps corretos para datas, tabelas normalizadas, colunas e tabelas em ingles, etc...

3. **Login e auth**
Essa parte e bemm simples e acredito que, nem precise de uma lib da autenticacao, podemos fazer na mao. Obviamente teremos que hashear as senhas e garantir seguranca. Sessoes podem ser bem longas ou ate infinitas sem problema algum.

Aqui tambem tera a parte de criar tabelas, acredito que precisamos aqui apenas de users e sessions, lembrando que teremos dois tipos de usuarios, o player e o admin, pode ser so um enum em users, e nao uma tabela separada.

Como nao vai ter nenhum email, podemos ter apenas username e senha.

Deve existir no banco o campo "full_name" tambem para possibilitar adicionar o nome.

4. **Fase de grupos, apenas insercao, sem busca por resultados**
A primeira tela que caimos e a fase de grupos. Pro user comum deve aparecer a lista de todos os jogos. Minha ideia e colocar de forma similar a referencia  /references/globo_group_stage.png, onde a tabela esta na esquerda, com as posicoes, nome da selecao, pontos, jogos, vitorias, empates, derrotas, gols pro, gols contra, saldo de gols e ultimos jogos (circulos verde/vermelho indicando os ultimos jogos da selecao no campeonato).

Na direita, temos as rodadas. A rodada que aparece por "default" e a que esta sendo jogada. Exemplo abaixo.

Digamos que as rodadas sao:
1ª RODADA
17/06 Quarta 17:00
Inglaterra x Croácia

17/06 Quarta 20:00
Gana x Panamá

2ª RODADA
23/06 Terça 17:00
Inglaterra x Gana

23/06 Terça 20:00
Panamá x Croácia

Se hoje for 21/06, quer dizer que a rodada 1 acabou, mas a 2 ainda nao comecou, entao, a aba apresentada por padrao deve as a 1.

Se hoje for 23/06 as 17:40, a rodada 2 ja comecou, a 3 ainda nao iniciou, entao, por padrao, mostramos a 2.

Na parte onde temos as rodadas e as infos dos jogos, teremos quadrados para adicionarmos o placar dos jogos. Ao clicar, no quadrado dos gols de uma selecao, nao deve existir layout shift.

As requisicoes devem ser feitas onChange, quando o usuario mudar o placar, seja de qualquer selecao, o banco deve ser atualizado. Nao e onBlur, e ao digitar.

O campo deve permitir que o usuario escreva APENAS numeros positivos, com no maximo dois digitos (ou seja, entre 0 e 99).

Clicar varias vezes em um numero nao vai funcionar, o proprio input so vai mostrar 2 digitos.

Deve existir validacao extra utilizando ZOD para garantir as regras e impedir a requisicao caso necessario.

Erros sao retornados pro usuario com mensagens tratadas, nunca erro cru do backend.

Eu posso apenas alterar o placar ate a data da partida. Se o jogo e 12/06 as 16:00, posso alterar ate 12/06 as 17:59 (tudo esta, e deve estar no horário de brasília).

5. **Tela "Mata-mata"**
Nessa parte poderá ser visto o knockout stage, com uma visualização em cascata lateral, como e o design geralmente dessa parte. Veja o exemplo da cascata em references/knockout_stage.webp e references/knockout_stage_2.webp.

Os times serão adicionados automaticamente no final da fase de grupos (mais detalhes em ranking)

Lembrar na hora do design que tem disputa do terceiro lugar também.

Você so poderá apostar em um jogo da primeira fase, se o jogo tiver suas duas seleções definidas, se tiver apenas um ou nenhum, ficara desabilitado. (essa mesma logica inclusive deve ser seguida para todos os jogos, ambas seleções devem ser diferentes de null para você poder apostar)

Ao escolher o placar do jogo no mata a mata, a seleção escolhida como vencedora vai automaticamente aparecer no jogo seguinte, seguindo a cascata.

O player poderá definir suas apostas para todos os jogos do mata mata de uma vez so, sem precisar da definição dos times que vão jogar cada fase. (isso não invalida a regra do null, são coisas diferentes).

Quando o primeiro jogo da primeira fase do mata mata começar, as apostas de todos jogos do mata mata ficarão bloqueados.

Caso você selecione empate, deve aparecer uma checkbox ou algo do tipo para você indicar qual dos dois sera o vencedor nos pênaltis, sem necessidade de cravar o resultado dos pênaltis.

O banco de dados deve ser construído considerando que jogos da fase de grupos não tem pênaltis e do mata mata sim.

6. **Ranking**
Uma coisa que esqueci de mencionar antes, e que essas rotas vão ficar acima da pagina, não numa sidebar e sim numa nav simples e flutuante acima da pagina, bem pequena.

Enfim, a próxima rota vai ter o ranking, nessa pagina terá listado todos os usuários, do primeiro ao ultimo baseado nas pontuações.

Serão cards com uma medalha (rubi/esmeralda, ouro, prata e bronze), serão apenas quatro pessoas jogando então deixaremos apenas 4 opções mesmo.

Ficara do maior para o menor. A medalha e nome do primeiro colocado tem um tamanho maior e, vai diminuindo a cada um. Não e exageradamente menor, so levemente menor. Pontuação e padronizada.

Abaixo do ranking terá uma explicação simples e intuitiva de como funciona a pontuação do sistema. 

7. **Sistema de pontos**
Para o admin as rotas da fase de grupos e do mata a mata serão diferentes. Essas rotas não possibilitarão que ele faca suas apostas, e sim que ele escreva o resultado real das partidas. Ele terá um botão para "Recalcular pontuações", ja que o recalculo a cada alteracao seria demais, eu provavelmente vou adicionar de 5/6 jogos cada vez que entrar, portanto e bom ter esse botao pra ele calcular a pontuacao de todos players considerando todos os jogos, nao apenas o que mudou.

Tenho duvidas de como automatizar os jogos do mata mata, gostaria de, apos todos os jogos de um grupo terem seus valores adicionados, a selecao que passa de fase fosse automaticamente para o jogo do mata mata, porem, vendo o csv gerado, alguns jogos estao assim: 1º A contra 3º CEFHI. O que dificulta na hora de saber os confrontos. Tem duas possibilidades:
- Sera feito com sorteio, portanto, nao sera possivel automatizar isso e terei que adicionar manualmente depois;
- Existe uma regra como "selecoes do mesmo continente nao podem jogar contra nessa fase" ou alguma regra parecida, dessa forma, teriamos como automatizar, so precisariamos tambem de info extra do continente/federacao da selecao (caso seja essa seja a regra realmente). Em casos assim, conseguimos automatizar isso tambem, feito ao clicar no botao de "recalcular" tambem.

Precisamos pesquisar sobre a regra realmente e validar a forma correta de proceder nesse caso.

Nao tenho certeza da pontuacao ideal, teria que pensar melhor no que fica mais justo e balanceado. Vou dar mais importancia para fases finais tambem. Aqui esta minha sugestao:

Fase de grupos:
Acertar vencedor/empate de uma partida +5 pontos;
Acertar o placar exato de uma partida +10 pontos (não acumula com a regra anterior);

(regras abaixo apenas validas apos todos as partidas do grupo terem seus resultados adicionados)
Acertar seleções que passam de fase +15 pontos;
Acertar a posição exata de todas seleções no grupo +30 pontos (não acumula com a regra anterior);

Mata mata:
16-avos:
Acertar vencedor de uma partida +10 pontos;
Acertar o placar exato de uma partida +20 pontos (não acumula com a regra anterior);

Oitavas:
Acertar vencedor de uma partida +15 pontos;
Acertar o placar exato de uma partida +30 pontos (não acumula com a regra anterior);

Quartas:
Acertar vencedor de uma partida +20 pontos;
Acertar o placar exato de uma partida +40 pontos (não acumula com a regra anterior);

Semifinal:
Acertar vencedor de uma partida +25 pontos;
Acertar o placar exato de uma partida +50 pontos (não acumula com a regra anterior);

Terceiro lugar:
Acertar vencedor de uma partida +25 pontos;
Acertar o placar exato de uma partida +50 pontos (não acumula com a regra anterior);

Final:
Acertar vencedor de uma partida +50 pontos;
Acertar o placar exato de uma partida +100 pontos (não acumula com a regra anterior);

(obs: jogos que vao para penaltis desconsideram o placar de penaltis e consideram o vencedor, se o jogo Croacia x Belgica terminar em 0 x 0, e a Belgica ganhou nos penaltis e, o usuario colocou 0 x 0 mas que a Croacia passa, ele nao ganhara pontos. O usuario tambem nao tera a opcao de definir qual o placar de gols dos penaltis, apenas quem vencer em caso de empate e o placar do tempo normal)

Apos o admin definir o resultado de uma partida, a UI para o player deve mudar. Deve aparecer de forma intuitiva se ele acertou ou errou, seja adicionando uma borda verde/vermelho, riscando o placar errado, dando highlight se o placar estiver certo, etc. A UI deve ser pensada para ficar claro: quantos pontos ele ganhou naquela partida, se ele acertou ou errou o vencedor, se ele acertou ou errou o placar.

A tabela tambem tera algum UI em relacao a isso, deve ficar claro se ele acertou as posicoes ou errou, colorindo talvez a row da tabela com uma legenda (verde: acertou posicao exata, azul: acertou que iria passar mas errou a posicao, vermelho: errou ambos)

Exemplos: 

Croacia 2 X 0 Uruguai
        1 X 1 (riscado)

dai esse 1x1 poderia ser um chip um pouco faded e riscado.

Se acertar, podemos deixar o texto bold e verde e a indicacao de pontuacao em algum lugar.

Enfim, precisamos ser criativos para o Design dessa parte, garantir um minimalismo, facil entendimento e uma interface moderna e intuitiva. 

Algumas referencias pro mata mata: 
references/lol_worlds_knockout.png

IMPORTANTE: Todas essas UIs que vao aparecer ao definir o resultado de partidas nao devem causar layout shift na interface, seus espacos precisam estar predefinidos, se vamos adicionar uma borda de 2px verde quando algo estiver correto, precisamos colocar uma borda de 2px branca ou cinza que existira sempre.

8. **Outros detalhes**
- Em qualquer tela, pra um usuário tipo player, deve aparecer sua pontuação e posição atual no canto superior direito. EXCETO no ranking onde já vai estar listado isso.
- Tem que ter um botão de logout, pode ser a direita do item anterior, so o ícone mesmo.
- Apos o resultado da final ser adicionado, tera react-confetti ao acessar a pagina do ranking.

### SUGESTÕES DE SKILLS/ GUIAS PARA AGENTES

BUSINESS-LOGIC.md
DESIGN-INSTRUCTIONS.md
IMPLEMENTATION-RULES.md
tasks/ com um md pra cada task.