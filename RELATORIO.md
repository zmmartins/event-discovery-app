# Do design de alta fidelidade ao protótipo funcional: implementação e avaliação de uma aplicação social de descoberta de eventos locais

## 0. Capa, repositório e resumo

| Campo              | Valor                                                       |
| ------------------ | ----------------------------------------------------------- |
| Unidade curricular | Aplicações Multimédia Interativas 2025/2026                 |
| Projeto            | Event Discovery App                                         |
| Aluno              | TODO - inserir nome completo                                |
| Número             | TODO - inserir número de aluno                              |
| Curso              | TODO - inserir curso/mestrado                               |
| Data               | 2 de julho de 2026 - TODO - confirmar data final de entrega |
| Repositório        | <https://github.com/zmmartins/event-discovery-app.git>      |

TODO - inserir imagem de capa, por exemplo uma composição com os principais ecrãs finais.

### Resumo

Este relatório descreve a evolução da Event Discovery App, uma aplicação móvel para descoberta social de eventos locais, desde as fases iniciais de prototipagem em papel e Figma até a um protótipo funcional desenvolvido com Expo e React Native. O conceito central é permitir que o utilizador descubra eventos próximos através de mapa e lista, receba recomendações espontâneas através de Shake to Discover e construa um perfil do tipo passaporte cultural com memórias de eventos frequentados.

O protótipo final é orientado para dispositivos móveis nativos, porque as interações principais dependem de mapa, localização, gestos, sensores, feedback háptico e superfícies nativas. A implementação não se limitou a reproduzir ecrãs: revelou limitações e oportunidades que obrigaram a ajustar a interação, a animação, a hierarquia visual e a forma como o estado do sistema é comunicado ao utilizador.

O sistema inclui ainda registo de interações para apoio à avaliação de usabilidade, com exportação em JSON/CSV e um painel de apoio ao facilitador. Os dados estatísticos dos testes finais devem ser inseridos nas secções 10 e 11 depois da recolha real com 5-6 participantes.

---

## 1. Introdução

### 1.1 Contexto do projeto

Este projeto dá continuidade ao trabalho desenvolvido nos laboratórios anteriores. A proposta inicial partiu de um problema comum em contextos urbanos e culturais: muitos eventos locais, independentes ou de nicho têm pouca visibilidade, enquanto os utilizadores tendem a descobrir experiências através de redes sociais dispersas, recomendações informais ou plataformas demasiado comerciais.

A Event Discovery App propõe uma experiência móvel centrada na descoberta contextual, social e espontânea. Em vez de apresentar apenas uma listagem tradicional de eventos, o protótipo combina exploração geográfica, navegação visual por cartões, pistas sociais de amigos e um perfil que guarda experiências passadas como memórias culturais.

TODO - inserir fotografia ou digitalização do primeiro protótipo em papel.

### 1.2 Conceito central

A aplicação é uma plataforma mobile-first de descoberta social de eventos. O utilizador pode explorar eventos próximos num mapa, alternar para uma lista visual em duas colunas, abrir detalhes de cada evento, guardar ou aderir a eventos, usar o gesto de abanar o telemóvel para receber recomendações e consultar um perfil que organiza eventos frequentados, eventos futuros e eventos guardados.

O conceito pode ser resumido assim: uma aplicação móvel onde a descoberta de eventos não acontece apenas por pesquisa, mas também por contexto, movimento, imagem e memória.

### 1.3 Utilizadores-alvo

Os utilizadores-alvo principais são:

- pessoas locais que querem quebrar a rotina e encontrar experiências próximas;
- viajantes que procuram eventos mais autênticos ou menos turísticos;
- utilizadores que valorizam contexto social, como perceber que amigos vão a um evento ou já estiveram em experiências semelhantes;
- organizadores pequenos ou independentes que beneficiariam de maior visibilidade.

TODO - inserir persona(s) ou resumo das personas definidas em Lab 1, se existirem.

### 1.4 Contributo principal do protótipo final

O contributo principal desta fase foi transformar o conceito desenhado num protótipo funcional, com interações reais em dispositivo móvel. A passagem para implementação tornou visíveis questões que o protótipo visual não conseguia testar totalmente: conflitos entre gestos, comportamento nativo do mapa, continuidade de animações, carregamento de imagens, legibilidade em ecrã real, estados locais e registo de interações.

Por isso, o projeto final deve ser entendido como uma iteração de design e não apenas como uma fase de programação. A implementação validou partes do conceito original, mas também levou a decisões novas, sobretudo no mapa, no fluxo de Shake to Discover, na ficha de detalhe e no perfil cultural.

---

## 2. Requisitos e continuidade das fases anteriores

### 2.1 Requisitos do enunciado

| Requisito                                                 | Forma como o protótipo final o aborda                                                                            | Evidência a incluir                                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Protótipo funcional                                       | Aplicação Expo + React Native executável em iOS/Android, com ecrãs navegáveis e interações reais.                | TODO - inserir link para vídeo curto ou screenshots do protótipo a correr num telemóvel. |
| Screenshots do sistema                                    | O relatório reserva espaço para screenshots do mapa, lista, detalhe, Shake to Discover, perfil e painel de logs. | TODO - inserir grelha de screenshots na secção 3.2.                                      |
| Justificação de alterações face aos protótipos anteriores | A secção 4 descreve a evolução entre protótipo em papel, Figma e implementação funcional.                        | TODO - inserir screenshots comparativos papel/Figma/final.                               |
| Testes de usabilidade com 5-6 utilizadores                | A metodologia está definida na secção 9.                                                                         | TODO - inserir participantes reais, datas, contexto e fotografias autorizadas.           |
| Dados quantitativos de logs                               | O protótipo regista interações, tarefas e sessões, com exportação em JSON/CSV.                                   | TODO - inserir ficheiros exportados e tabelas estatísticas na secção 10.                 |
| Link do repositório                                       | O link está na capa e no anexo E.                                                                                | <https://github.com/zmmartins/event-discovery-app.git>                                   |
| Pelo menos dois tipos de feedback                         | Feedback visual, textual, háptico, vibração e animação.                                                          | Screenshots e descrição na secção 8.                                                     |
| Toque + dois inputs com sensores                          | Toque/gestos, localização/GPS e acelerómetro.                                                                    | Descrição nas secções 6 e 8.                                                             |

### 2.2 Continuidade desde Lab 1

O conceito inicial definia quatro tarefas principais:

1. descobrir espontaneamente eventos próximos;
2. navegar por eventos através de um mapa local;
3. construir um perfil/passaporte cultural com experiências frequentadas;
4. publicar um novo evento.

No protótipo funcional foram priorizadas as três primeiras tarefas. A publicação de eventos não está implementada nesta versão e deve ser considerada trabalho futuro. Esta decisão mantém o foco no núcleo da experiência de descoberta, que era o mais importante para demonstrar interação multimodal, feedback e avaliação com utilizadores.

TODO - inserir tabela ou imagem com as tarefas originais de Lab 1.

### 2.3 Continuidade desde Lab 2

A fase de Figma introduziu uma visão mais concreta da interface, incluindo navegação inferior, exploração por mapa/lista, ecrãs de detalhe e um fluxo de descoberta espontânea. No protótipo funcional, essa base foi mantida, mas ajustada ao comportamento real do dispositivo.

As alterações mais relevantes foram:

- tornar os pins do mapa mais legíveis e menos decorativos;
- transformar a seleção de um pin numa pré-visualização contextual antes da navegação para detalhe;
- dar maior peso visual às imagens na lista;
- tornar o Shake to Discover num modo de descoberta persistente e reversível;
- expandir o perfil cultural para uma área mais expressiva, com bilhetes de memória, fotografias e vistas por secção.

TODO - inserir screenshots do protótipo Figma original e das versões intermédias.

---

## 3. Visão geral do protótipo funcional final

### 3.1 Ecrãs implementados

#### Explore Map

O mapa é a superfície principal de descoberta. Mostra eventos futuros através de pins personalizados, com tamanho influenciado pela popularidade e anéis que comunicam presença de amigos. Ao tocar num pin, o mapa recentra-se no evento e abre uma pré-visualização animada em formato de poster. O utilizador pode abrir o detalhe, guardar o evento ou usar ações contextuais por pressão longa.

#### Explore List

A lista apresenta eventos numa grelha visual de duas colunas. Os cartões são guiados pela imagem, mostram data, título e contexto social, e permitem guardar eventos diretamente. Quando o Discovery Mode está ativo, a lista passa a mostrar apenas as recomendações selecionadas pelo fluxo de descoberta.

#### Event Detail

O detalhe de evento inclui imagem principal, data, hora, categoria, descrição, local, contexto social, botões de guardar e participação, e um mini-mapa interativo. A ficha funciona como uma folha arrastável, com estado colapsado e expandido.

#### Shake to Discover

O Shake to Discover usa o acelerómetro para detetar o gesto de abanar o telemóvel. Quando o gesto é reconhecido, o sistema dá vibração/feedback háptico, executa uma animação visual e ativa o Discovery Mode com quatro recomendações.

#### Profile

O perfil funciona como passaporte cultural. Inclui imagem de fundo, folha arrastável, nome, bio, estatísticas e três secções: Attended, Going e Saved. A secção Attended mostra experiências passadas em cartões com metáfora de bilhete, fotografias de memória e expansão de imagem. Cada secção pode alternar entre lista e mapa.

#### Mensagens, Pesquisa, Comunidade e Notificações

Messages, Search e Community existem como separadores de navegação, mas ainda são placeholders simples. A área de Notifications foi usada no protótipo como painel de apoio aos testes de usabilidade, permitindo iniciar sessões, iniciar/terminar tarefas, ver métricas resumidas e exportar logs. Assim, nesta versão, Notifications não é uma funcionalidade final de notificações para utilizadores; é uma ferramenta de avaliação.

#### Dados de protótipo

A base local inclui 16 eventos publicados, distribuídos por 6 categorias, com datas entre 22 de maio de 2026 e 9 de agosto de 2026. O conjunto visível em Explore é filtrado em função da data de execução, disponibilidade, capacidade e estado de participação. A base inclui ainda 7 utilizadores mock, amizades, participações, imagens locais para eventos e fotografias específicas para memórias do perfil. No estado inicial, o utilizador atual tem 3 experiências frequentadas no passaporte cultural e a coleção de eventos guardados começa vazia.

### 3.2 Grelha de screenshots

TODO - inserir screenshot 1: mapa inicial com pins.

**Figura 1 - Explore Map:** vista principal de exploração geográfica, com pins personalizados e contexto visual dos eventos.

TODO - inserir screenshot 2: pin selecionado com pré-visualização/poster.

**Figura 2 - Pré-visualização de evento:** o pin transforma-se numa pré-visualização maior, mantendo continuidade espacial entre mapa e detalhe.

TODO - inserir screenshot 3: detalhe de evento em estado colapsado.

**Figura 3 - Event Detail colapsado:** a ficha inferior mostra informação essencial sem retirar totalmente o contexto visual.

TODO - inserir screenshot 4: detalhe de evento expandido com mini-mapa.

**Figura 4 - Event Detail expandido:** a informação do evento é complementada por mapa, amigos, descrição e ações de participação.

TODO - inserir screenshot 5: lista em duas colunas.

**Figura 5 - Explore List:** a grelha image-led reforça a descoberta exploratória e reduz a sensação de lista administrativa.

TODO - inserir screenshot 6: ecrã Shake to Discover antes do gesto.

**Figura 6 - Shake to Discover:** o ecrã convida a uma interação física simples e memorável.

TODO - inserir screenshot 7: Discovery Mode ativo na lista ou mapa.

**Figura 7 - Discovery Mode:** estado visual que comunica que a exploração está filtrada por recomendações.

TODO - inserir screenshot 8: perfil com folha colapsada.

**Figura 8 - Profile colapsado:** o perfil mantém o foco na identidade visual do utilizador e permite abrir a folha.

TODO - inserir screenshot 9: perfil expandido com secções Attended/Going/Saved.

**Figura 9 - Profile expandido:** as secções organizam a relação do utilizador com eventos passados, futuros e guardados.

TODO - inserir screenshot 10: cartão de memória em grelha, imagem completa e imagem expandida.

**Figura 10 - Memory ticket:** a experiência frequentada é representada como um bilhete físico, com fotografias e metadados do evento.

---

## 4. Evolução do design para a implementação

### 4.1 Porque é que a implementação alterou o design

A passagem de Figma para um protótipo funcional mostrou que várias decisões visuais precisavam de ser revistas quando colocadas num ecrã real, com gestos reais e componentes nativos. No Figma, é possível simular uma sequência de ecrãs, mas é mais difícil testar a relação entre mapa, camadas sobrepostas, animações, sensores, estado persistente e conflitos de toque.

No protótipo final, a implementação funcionou como nova fase de design. Algumas ideias foram simplificadas para ganhar legibilidade; outras foram enriquecidas porque o dispositivo permitia interações mais fortes, como vibração, haptics, localização e acelerómetro.

TODO - inserir sequência visual: papel -> Figma -> primeira implementação -> versão final.

### 4.2 Registo de decisões de design

| Área                 | Design anterior                                                                               | Implementação final                                                                                               | Razão da alteração                                                                                       | Evidência                                                       |
| -------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Pins de evento       | TODO - inserir descrição e imagem dos pins no papel/Figma.                                    | Pins circulares com imagem do evento, tamanho associado à popularidade e anel secundário para presença de amigos. | A versão final precisava de ser legível em mapa denso e comunicar informação sem excesso visual.         | TODO - screenshot antes/depois.                                 |
| Seleção de pin       | TODO - confirmar se o protótipo anterior navegava diretamente ou apenas expandia visualmente. | Toque no pin recentra o mapa e abre uma pré-visualização animada.                                                 | Mantém o contexto espacial e reduz navegação desnecessária.                                              | TODO - sequência de 3 screenshots: pin -> animação -> poster.   |
| Lista de eventos     | TODO - inserir screenshot do layout Figma.                                                    | Feed em duas colunas, dominado por imagem, com bookmark e avatars.                                                | Reforça exploração visual e torna os eventos mais comparáveis rapidamente.                               | TODO - screenshot Figma vs final.                               |
| Shake to Discover    | TODO - inserir fluxo anterior.                                                                | Shake ativa um modo de descoberta com quatro recomendações, aplicado ao mapa e à lista.                           | O modo persistente torna o estado reversível e compreensível depois da animação inicial.                 | TODO - screenshot do ecrã de shake e do pill de Discovery Mode. |
| Perfil cultural      | TODO - indicar o estado do perfil em Lab 1/Lab 2.                                             | Perfil completo com folha arrastável, secções Attended/Going/Saved, cartões de memória e mapas por secção.        | O conceito de passaporte cultural ganhou importância como prova de valor social e memória do utilizador. | TODO - screenshots do perfil final.                             |
| Cartões de memória   | TODO - inserir conceito original, se existir.                                                 | Metáfora de bilhete físico, com recortes, perfuração, fotografias em grelha e imagem expandida.                   | Dá identidade própria às experiências frequentadas e torna o passado do utilizador mais tangível.        | TODO - screenshot dos três estados do cartão.                   |
| Mini-mapa no detalhe | TODO - inserir screenshot do detalhe no Figma.                                                | Mini-mapa interativo com distinção entre gesto de uma mão e gesto de duas mãos.                                   | Resolve conflito entre arrastar a folha e manipular o mapa.                                              | TODO - screenshot/diagrama da interação.                        |
| Densidade visual     | TODO - inserir exemplos de versões mais carregadas.                                           | Algumas camadas, efeitos e detalhes foram ajustados para manter clareza no dispositivo.                           | A avaliação visual no ecrã real mostrou que excesso de decoração competia com tarefas principais.        | TODO - screenshots de iterações intermédias.                    |

### 4.3 Princípios de design que orientaram as alterações

As alterações respeitaram princípios de design de interfaces discutidos ao longo da unidade curricular:

- **Hierarquia visual:** imagens, título, data e ações principais são priorizados, sobretudo nos cartões e no detalhe.
- **Proximidade e agrupamento:** metadados relacionados são apresentados juntos, como data/preço/local ou secções do perfil.
- **Feedback:** ações como guardar, aderir, selecionar foto, concluir shake ou mudar de modo produzem resposta visual e/ou háptica.
- **Consistência:** mapa, lista e perfil reutilizam linguagem visual semelhante para eventos, imagens e presença social.
- **Affordance:** botões, folhas arrastáveis, tabs e cartões comunicam que podem ser tocados, arrastados ou expandidos.
- **Acessibilidade ao toque:** navegação inferior, botões compactos mas tocáveis e folhas inferiores favorecem uso com o polegar.
- **Estado do sistema:** Discovery Mode usa indicadores visuais para mostrar que o utilizador está num modo filtrado.

---

## 5. Arquitetura de implementação

### 5.1 Stack tecnológica

O protótipo final foi desenvolvido com:

- Expo SDK 54;
- React Native 0.81;
- React 19;
- Expo Router;
- React Native Maps;
- React Native Reanimated e Gesture Handler;
- Expo Sensors;
- Expo Location;
- Expo Haptics;
- AsyncStorage;
- Expo Blur, Linear Gradient e Glass Effect;
- React Native SVG e Masked View;
- Expo FileSystem e Sharing para exportação dos logs.

Esta stack foi escolhida porque permite validar a aplicação num contexto móvel real, incluindo mapas nativos, sensores, localização, feedback háptico e navegação por separadores nativos.

### 5.2 Decisão native-first

O protótipo foi pensado primeiro para iOS/Android. A versão web não é tratada como alvo principal de validação porque as funcionalidades centrais dependem de componentes e capacidades nativas: mapa, localização, haptics, sensores e gestos. Esta decisão é coerente com o tipo de interação pretendido, já que Shake to Discover e exploração em mapa perdem significado quando vistos apenas como páginas web.

TODO - inserir fotografia do protótipo a correr num dispositivo físico.

### 5.3 Estrutura conceptual do projeto

A implementação segue uma separação por responsabilidades:

```text
Rotas da aplicação
   ↓
Ecrãs principais
   ↓
Componentes reutilizáveis
   ↓
Serviços de caso de uso
   ↓
Repositórios locais
   ↓
Dados mock e assets
```

Esta estrutura permite que o protótipo use dados locais agora, mas mantenha uma forma próxima de uma futura integração com backend. Os ecrãs consomem dados já preparados para a interface, em vez de dependerem diretamente dos registos mock. Isso torna mais simples substituir a origem dos dados no futuro, sem redesenhar toda a experiência.

### 5.4 Relação com padrões de software de interface

O projeto não implementa rigidamente um padrão como MVC ou MVVM, mas segue uma abordagem de separação de responsabilidades. A navegação encaminha para ecrãs, os ecrãs compõem a experiência, os componentes representam unidades reutilizáveis, os serviços tratam ações da aplicação e os repositórios isolam o acesso aos dados.

Esta organização é importante num protótipo funcional porque evita que a interface seja apenas uma maquete visual. Mesmo sem backend real, o sistema já distingue estado, apresentação, interação e dados, permitindo testar fluxos mais próximos de uma aplicação real.

---

## 6. Fluxos de interação implementados

### 6.1 Explore Map

Ao abrir a área Explore, o utilizador vê um mapa com eventos futuros. A localização por defeito está centrada em Lisboa, mas o protótipo pede permissão para usar a localização real do utilizador e pode recentrar o mapa quando essa informação está disponível.

Os eventos são representados por pins personalizados. O tamanho do pin comunica popularidade, enquanto o anel secundário comunica presença de amigos. Isto permite perceber rapidamente quais os eventos mais relevantes, sem abrir cada detalhe.

Ao tocar num pin, o mapa recentra-se no evento e abre uma pré-visualização animada. Esta pré-visualização funciona como passo intermédio entre exploração e detalhe, evitando que cada toque leve imediatamente para uma nova página. A pressão longa num pin abre um menu contextual com ações como expandir, guardar e partilhar. A partilha está registada como ação placeholder e não corresponde ainda a uma partilha real de produto.

Quando o Discovery Mode está ativo, o mapa mostra apenas os eventos recomendados e usa indicadores visuais específicos para comunicar que o utilizador está num estado filtrado.

### 6.2 Explore List

A lista apresenta os eventos numa grelha de duas colunas. Cada cartão usa imagem, data, título e pequenos avatars para indicar presença social. O utilizador pode abrir o detalhe tocando na imagem ou no bloco de texto, e pode guardar o evento através do ícone de bookmark.

A pressão longa num cartão abre um menu contextual semelhante ao do mapa. Tal como no mapa, a ação de partilha existe como placeholder registado, mas não como funcionalidade final.

Quando o Discovery Mode está ativo, a lista é filtrada e ordenada pelas recomendações produzidas no Shake to Discover. Isto torna a descoberta consistente entre mapa e lista.

### 6.3 Event Detail

O detalhe do evento apresenta a imagem principal, data, hora, categoria, descrição, preço, localização, amigos e ações de guardar/participar. A ficha é arrastável, permitindo ao utilizador alternar entre uma vista mais compacta e uma vista expandida.

As ações de guardar, aderir e cancelar participação alteram o estado local durante a sessão e produzem feedback háptico. Como o protótipo não tem backend, estas alterações não persistem depois de reiniciar o runtime.

O mini-mapa do detalhe foi uma decisão importante de interação. Como a ficha também é arrastável, o mapa não podia responder da mesma forma a todos os gestos. A solução final distingue os gestos: arrastar com um dedo sobre o mini-mapa move a ficha, enquanto gestos com dois dedos permitem controlar o mapa. Isto reduz conflitos e mantém a ficha utilizável.

### 6.4 Shake to Discover

O ecrã Shake to Discover transforma a descoberta num gesto físico. O acelerómetro deteta quando o utilizador abana o telemóvel; quando isso acontece, o sistema vibra, mostra progresso visual e aplica feedback háptico. No fim da animação, o protótipo ativa o Discovery Mode e redireciona para a lista filtrada.

O Discovery Mode seleciona quatro eventos futuros com base numa ordenação pela distância a uma coordenada de descoberta em Lisboa, com pequena variação aleatória para evitar resultados demasiado mecânicos. O modo mantém-se ativo em mapa e lista até ser dispensado pelo utilizador.

TODO - inserir screenshot ou vídeo curto do gesto e da transição para lista.

### 6.5 Profile / passaporte cultural

O perfil é uma das áreas mais completas do protótipo final. O ecrã usa uma imagem de fundo/hero e uma folha arrastável com efeito desfocado. A folha mostra o username, nome, descrição, estatísticas e as secções Attended, Going e Saved.

A secção Attended mostra experiências frequentadas, validadas a partir de participações passadas e fotografias de memória. Cada experiência aparece como um bilhete visual, combinando fotografias, metadados do evento e controlos de expansão. O cartão permite alternar entre grelha de fotografias e imagem única, selecionar fotografias através de uma barra vertical e expandir a imagem dentro do bilhete.

As secções Going e Saved mostram eventos futuros e eventos guardados. Cada secção pode alternar entre lista e mapa. No estado inicial dos dados locais, Saved começa vazio; por isso, esta secção depende das ações do utilizador durante a sessão.

TODO - inserir sequência do perfil: folha colapsada, folha expandida, secções, mapa e cartão de memória expandido.

---

## 7. Desafios técnicos e soluções de interação

### 7.1 Desafio: overlays de mapa, pins escondidos e pré-visualização animada

O mapa foi uma das áreas mais exigentes. Os mapas nativos não se comportam como uma superfície normal de interface: os markers são renderizados numa camada própria, e a relação entre os pins, a posição no ecrã e as overlays exige cuidados adicionais.

O objetivo era fazer com que um pin parecesse transformar-se numa pré-visualização maior. Para isso, foi necessário medir a posição do pin no ecrã, recentrar o mapa antes da animação, esconder ou compensar visualmente o pin selecionado durante a transição e garantir que a pré-visualização não surgia desalinhada. Em zonas com pins próximos, também foi necessário resolver qual o pin prioritário quando havia toques sobrepostos.

A solução final combina pins com prioridade visual, cálculo de posição, pré-carregamento de imagens e uma overlay separada para a pré-visualização. Isto melhora a continuidade visual e ajuda o utilizador a perceber que a ficha veio daquele ponto do mapa.

TODO - inserir diagrama ou screenshots da sequência de morph.

### 7.2 Desafio: conflitos de gestos em mapa, detalhe e perfil

O protótipo usa vários gestos semelhantes em contextos diferentes: arrastar folhas, interagir com mapas, fazer scroll, selecionar fotografias e expandir imagens. Sem regras claras, estes gestos entram em conflito.

No detalhe, o conflito principal era entre arrastar a ficha e manipular o mini-mapa. A solução foi reservar gestos de dois dedos para o mapa e gestos de um dedo para a ficha. No perfil, o desafio era permitir scroll da folha e, ao mesmo tempo, permitir a seleção vertical de fotografias no cartão de memória. A solução passa por desativar temporariamente o scroll do pai enquanto a barra de fotografias está ativa.

Estas decisões melhoram a previsibilidade da interação. O utilizador não precisa de compreender a implementação, mas deve sentir que cada gesto tem uma resposta coerente.

TODO - inserir tabela ou imagem com os gestos principais e respetivos efeitos.

### 7.3 Desafio: transições e renderização condicional nos cartões de memória

Os cartões de memória do perfil exigiram uma transição mais cuidada do que uma simples troca de estado. A passagem entre grelha, imagem única e imagem expandida precisava de parecer contínua. Se a interface apenas substituísse uma vista por outra, a interação ficaria abrupta e menos convincente.

A solução final usa animações de altura, opacidade e sobreposição para que a fotografia pareça expandir a partir da posição de origem. O bilhete ajusta a sua altura, os recortes e a área inferior acompanham a mudança, e a identidade do evento mantém-se visível. A interação recebe também feedback háptico, reforçando a sensação de controlo.

Este caso mostra bem como a implementação foi também uma fase de design: a metáfora visual do bilhete só funcionou depois de resolver continuidade, proporções e estados intermédios.

TODO - inserir sequência com grelha, toque numa fotografia, expansão e colapso.

### 7.4 Desafio: equilibrar ambição visual e clareza

O projeto tem uma linguagem visual forte: imagens grandes, cores vivas, efeitos translúcidos, cartões de poster e bilhetes de memória. Durante a implementação, foi necessário ajustar essa ambição para evitar ruído visual.

Alguns elementos que funcionam bem em ecrãs estáticos podem tornar-se pesados quando combinados com mapa, movimento, gestos e dados dinâmicos. Por isso, a versão final privilegia feedback claro, superfícies consistentes e ações visíveis. A estética manteve-se expressiva, mas foi subordinada à compreensão do estado e à fluidez da tarefa.

TODO - inserir exemplos de decisões visuais reduzidas ou ajustadas durante a implementação.

### 7.5 Limitações funcionais do protótipo

O protótipo é funcional, mas ainda não é um produto completo. As principais limitações são:

- não existe backend real;
- não existe autenticação;
- não existem pagamentos ou bilhética real;
- não existe fluxo de publicação de eventos;
- não existe upload real de imagens;
- não existe chat funcional;
- Messages, Search e Community são placeholders;
- ações de filtro e partilha ainda são placeholders registados;
- as alterações de guardar/participar são locais e reiniciam ao recarregar a aplicação;
- parte do conteúdo de detalhe, como reviews, é texto de protótipo;
- a validação principal é iOS/Android, não web.

---

## 8. Inputs, sensores e feedback

### 8.1 Métodos de input≤

| Input           | Onde é usado                                               | Objetivo                                             |
| --------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| Toques          | navegação, botões, pins, cartões, tabs                     | selecionar, abrir, guardar e confirmar ações         |
| Arrastos/swipes | folhas do detalhe e perfil, scroll, seleção de fotografias | manipular vistas e navegar dentro de conteúdo        |
| Pressão longa   | pins e cartões                                             | abrir ações contextuais                              |
| Localização/GPS | mapa, estado "near you", recentramento e recomendações     | contextualizar a descoberta                          |
| Acelerómetro    | Shake to Discover                                          | ativar descoberta espontânea através de gesto físico |

### 8.2 Tipos de feedback

| Feedback           | Exemplos no protótipo                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| Visual             | pins, anéis de amigos, botões ativos, Discovery Mode, cartões, tabs, estados vazios                      |
| Textual            | datas, preços, localizações, categorias, mensagens de estado e metadados do evento                       |
| Háptico            | guardar evento, aderir/cancelar participação, selecionar fotografia, concluir shake                      |
| Vibração           | deteção do gesto Shake to Discover                                                                       |
| Movimento/animação | morph do pin para poster, folhas arrastáveis, expansão de fotografia, entrada da lista em Discovery Mode |

### 8.3 Cumprimento dos requisitos multimodais

O protótipo cumpre o requisito de usar toque e pelo menos dois inputs ligados a sensores: localização e acelerómetro. Também cumpre o requisito de apresentar pelo menos dois tipos de feedback, já que combina feedback visual, textual, háptico, vibração e animação.

TODO - inserir tabela final de verificação dos requisitos multimodais, se o docente pedir evidência explícita.

---

## 9. Metodologia dos testes de usabilidade

### 9.1 Participantes

O enunciado pede testes com 5-6 utilizadores. Os participantes devem ser descritos anonimamente como P1-P6, com apenas a informação relevante para interpretar os resultados.

| Participante | Idade        | Perfil                                                 | Familiaridade com apps de eventos | Familiaridade com iOS/Android | Observações                   |
| ------------ | ------------ | ------------------------------------------------------ | --------------------------------- | ----------------------------- | ----------------------------- |
| P1           | TODO - idade | TODO - estudante/trabalhador/outro                     | TODO - baixa/média/alta           | TODO - plataforma habitual    | TODO - observações relevantes |
| P2           | TODO - idade | TODO - preencher                                       | TODO - preencher                  | TODO - preencher              | TODO - preencher              |
| P3           | TODO - idade | TODO - preencher                                       | TODO - preencher                  | TODO - preencher              | TODO - preencher              |
| P4           | TODO - idade | TODO - preencher                                       | TODO - preencher                  | TODO - preencher              | TODO - preencher              |
| P5           | TODO - idade | TODO - preencher                                       | TODO - preencher                  | TODO - preencher              | TODO - preencher              |
| P6           | TODO - idade | TODO - preencher, se tiver existido sexto participante | TODO - preencher                  | TODO - preencher              | TODO - preencher              |

TODO - inserir nota de consentimento informado e anonimização.

TODO - inserir fotografia(s) dos testes, se autorizadas.

### 9.2 Setup do teste

O teste deve ser realizado em sessões individuais, com o protótipo a correr num dispositivo móvel físico. Antes de cada sessão, o facilitador deve explicar o objetivo geral, garantir consentimento e pedir ao participante para pensar em voz alta durante as tarefas.

O protótipo inclui um painel de apoio à avaliação na área de Interaction Logs. Esse painel permite iniciar uma sessão limpa por participante, iniciar e terminar tarefas, refrescar métricas e exportar logs em JSON ou CSV. Durante as tarefas, o participante deve usar a aplicação normalmente; o facilitador regista observações, hesitações e erros.

TODO - indicar dispositivo usado.

TODO - indicar local e duração média das sessões.

TODO - indicar se foi usado ecrã gravado, fotografia ou apenas observação.

### 9.3 Tarefas

As tarefas foram definidas para representar objetivos reais de utilização, e não apenas cliques em funcionalidades isoladas.

| Tarefa                              | Objetivo                                                             | Critério de sucesso                                                                      |
| ----------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| T1 - Explorar eventos no mapa       | Encontrar um evento interessante no mapa e abrir a pré-visualização. | O participante seleciona um pin e compreende a pré-visualização.                         |
| T2 - Abrir detalhe de evento        | Consultar data, local, preço, descrição e contexto social.           | O participante chega ao detalhe e identifica a informação pedida.                        |
| T3 - Guardar ou aderir a um evento  | Executar uma ação de compromisso.                                    | O participante guarda ou adere e nota a alteração de estado/feedback.                    |
| T4 - Usar Shake to Discover         | Ativar recomendações através do gesto físico.                        | O participante abana o telemóvel, ativa Discovery Mode e percebe que a lista/mapa mudou. |
| T5 - Explorar o passaporte cultural | Abrir o perfil, ver eventos frequentados e expandir uma memória.     | O participante abre uma memória e manipula fotografia/estado do cartão.                  |
| T6 - Alternar entre lista e mapa    | Confirmar que o participante entende os dois modos de exploração.    | O participante alterna entre mapa e lista e percebe a relação entre ambos.               |

TODO - inserir script final usado pelo facilitador.

TODO - indicar se todos os participantes fizeram todas as tarefas.

---

## 10. Dados quantitativos e estatística descritiva

### 10.1 Dados registados

O protótipo regista interações em armazenamento local e permite exportar os dados. Os registos incluem ações como abertura de ecrãs, mudanças de rota, seleção de pins, abertura de eventos, guardar/desguardar, participação, ativação/desativação de Discovery Mode, deteção de shake, interação com perfil e métricas de tarefas.

O painel de Interaction Logs permite:

- iniciar sessão de teste por participante;
- iniciar e terminar tarefas;
- limpar logs para uma sessão nova;
- ver métricas resumidas;
- exportar JSON bundle;
- exportar CSV.

TODO - inserir ficheiro JSON exportado dos testes.

TODO - inserir ficheiro CSV exportado dos testes.

### 10.2 Variáveis a reportar

| Variável                            | Fonte                                | Tipo            | Estatística recomendada        |
| ----------------------------------- | ------------------------------------ | --------------- | ------------------------------ |
| Sucesso por tarefa                  | observação + fim de tarefa no painel | nominal/binária | contagem e percentagem         |
| Tempo de conclusão                  | logs de início/fim de tarefa         | razão           | média, desvio-padrão e mediana |
| Número de interações                | logs                                 | contagem        | mediana, mínimo e máximo       |
| Número de cliques/toques relevantes | logs                                 | contagem        | mediana, mínimo e máximo       |
| Erros ou retrocessos                | observação + logs                    | contagem        | mediana, mínimo e máximo       |
| Tentativas até Shake funcionar      | observação + logs de shake           | contagem        | mediana, mínimo e máximo       |
| Dificuldade percebida               | questionário pós-tarefa              | ordinal         | mediana e intervalo            |

### 10.3 Tabelas de resultados

#### Tabela 1 - Resumo dos participantes

TODO - inserir tabela preenchida com P1-P6, idade, perfil, familiaridade e observações.

#### Tabela 2 - Sucesso por tarefa

| Participante | T1 Mapa | T2 Detalhe | T3 Guardar/aderir | T4 Shake | T5 Perfil | T6 Lista/mapa |
| ------------ | ------- | ---------- | ----------------- | -------- | --------- | ------------- |
| P1           | TODO    | TODO       | TODO              | TODO     | TODO      | TODO          |
| P2           | TODO    | TODO       | TODO              | TODO     | TODO      | TODO          |
| P3           | TODO    | TODO       | TODO              | TODO     | TODO      | TODO          |
| P4           | TODO    | TODO       | TODO              | TODO     | TODO      | TODO          |
| P5           | TODO    | TODO       | TODO              | TODO     | TODO      | TODO          |
| P6           | TODO    | TODO       | TODO              | TODO     | TODO      | TODO          |

#### Tabela 3 - Tempo de conclusão por tarefa

| Tarefa | Média | Desvio-padrão | Mediana | Mínimo | Máximo |
| ------ | ----- | ------------- | ------- | ------ | ------ |
| T1     | TODO  | TODO          | TODO    | TODO   | TODO   |
| T2     | TODO  | TODO          | TODO    | TODO   | TODO   |
| T3     | TODO  | TODO          | TODO    | TODO   | TODO   |
| T4     | TODO  | TODO          | TODO    | TODO   | TODO   |
| T5     | TODO  | TODO          | TODO    | TODO   | TODO   |
| T6     | TODO  | TODO          | TODO    | TODO   | TODO   |

#### Tabela 4 - Número de interações por tarefa

| Tarefa | Mediana de interações | Mínimo | Máximo | Observação |
| ------ | --------------------- | ------ | ------ | ---------- |
| T1     | TODO                  | TODO   | TODO   | TODO       |
| T2     | TODO                  | TODO   | TODO   | TODO       |
| T3     | TODO                  | TODO   | TODO   | TODO       |
| T4     | TODO                  | TODO   | TODO   | TODO       |
| T5     | TODO                  | TODO   | TODO   | TODO       |
| T6     | TODO                  | TODO   | TODO   | TODO       |

TODO - inserir gráfico de barras com tempo médio por tarefa e desvio-padrão.

TODO - inserir gráfico/boxplot do número de interações por tarefa, se útil.

### 10.4 Observações qualitativas

As observações qualitativas devem complementar os logs. Devem ser agrupadas por temas:

- o que os utilizadores compreenderam imediatamente;
- onde hesitaram;
- que feedback foi mais claro;
- que gestos precisaram de explicação;
- que elementos foram valorizados;
- que pontos devem ser melhorados.

TODO - inserir observações reais dos participantes, agrupadas por tema e com exemplos anónimos.

---

## 11. Resultados e discussão

### 11.1 Eficácia

TODO - inserir interpretação dos resultados de sucesso por tarefa.

Nesta secção deve ser indicado quantos participantes concluíram cada tarefa e onde ocorreram falhas. A análise deve distinguir falhas do protótipo, falhas de compreensão e limitações do teste. Por exemplo, se algum participante não percebeu que o Discovery Mode estava ativo, isso deve ser discutido como problema de estado do sistema e não apenas como erro do utilizador.

### 11.2 Eficiência

TODO - inserir análise dos tempos e número de interações.

Devem ser identificadas as tarefas mais rápidas e mais demoradas. É provável que tarefas com gestos menos convencionais, como Shake to Discover ou expansão das memórias do perfil, exijam mais tempo na primeira utilização; no entanto, isto só deve ser afirmado se os dados reais o confirmarem.

### 11.3 Aprendizagem e compreensão

TODO - inserir evidência sobre learnability.

Esta secção deve analisar se os participantes compreenderam a navegação por tabs, a relação entre mapa e lista, a existência da pré-visualização antes do detalhe, o significado do Discovery Mode e a manipulação do cartão de memória. As observações think-aloud são especialmente úteis aqui.

### 11.4 Feedback e estado do sistema

TODO - inserir exemplos reais observados nos testes.

O protótipo usa feedback visual, textual, háptico, vibração e animação. A discussão deve avaliar se estes feedbacks foram suficientes para os participantes entenderem que uma ação tinha ocorrido. Em particular, deve ser avaliado:

- se o bookmark foi percebido como estado guardado;
- se aderir/cancelar participação foi claro;
- se o Shake to Discover comunicou conclusão;
- se o Discovery Mode pareceu um modo ativo e não apenas uma mudança aleatória de lista;
- se a expansão de fotografias no perfil pareceu controlável.

### 11.5 Discussão das alterações após implementação

Mesmo antes da avaliação formal, a implementação já levou a alterações relevantes: o mapa exigiu uma pré-visualização separada, o detalhe precisou de regras específicas para o mini-mapa, o perfil exigiu gestão cuidadosa de scroll e seleção de fotografia, e o Discovery Mode tornou-se um estado persistente aplicado a mapa e lista.

TODO - completar esta discussão com alterações feitas depois dos testes de usabilidade, se existirem.

---

## 12. Limitações e trabalho futuro

### 12.1 Limitações do protótipo

As limitações atuais são:

- dados mock locais em vez de backend;
- ausência de autenticação real;
- estado de guardar/participar apenas durante a sessão;
- ausência de publicação real de eventos por organizadores;
- ausência de upload de imagens para memórias;
- ausência de chat e mensagens reais;
- ausência de pagamentos ou bilhética;
- ausência de notificações reais para utilizadores;
- Messages, Search e Community ainda como placeholders;
- filtros e partilha ainda como ações placeholder;
- validação principal em iOS/Android, não em web.

### 12.2 Limitações da avaliação

TODO - preencher depois dos testes.

Possíveis limitações a reportar:

- amostra pequena, por requisito do trabalho;
- participantes por conveniência;
- uso de um único dispositivo;
- sessões curtas;
- dados de eventos simulados;
- algumas tarefas baseadas em estado mock;
- influência do facilitador, se tiver havido ajuda durante tarefas.

### 12.3 Trabalho futuro

O trabalho futuro mais relevante inclui:

- integração com backend/API;
- autenticação e perfis reais;
- publicação de eventos por organizadores;
- filtros e pesquisa funcional;
- bilhética, RSVP ou pagamentos reais;
- upload de fotografias para experiências frequentadas;
- chat, mensagens e comunidade;
- notificações reais;
- onboarding para gestos menos óbvios;
- acessibilidade e testes com tecnologias assistivas;
- estudo de usabilidade com amostra maior;
- análise de desempenho em diferentes dispositivos.

Os filtros merecem destaque como evolução futura, porque a descoberta de eventos ganha valor quando o utilizador pode combinar localização, categoria, preço, data, popularidade e contexto social.

---

## 13. Conclusão

A Event Discovery App evoluiu de um conceito de descoberta social de eventos para um protótipo funcional, multimodal e avaliável. A implementação confirmou a pertinência dos fluxos principais: exploração por mapa, navegação por lista, detalhe de evento, descoberta por shake e perfil cultural.

O processo mostrou que a implementação não é apenas uma etapa técnica. Ao colocar o design num dispositivo real, surgiram problemas de gesto, mapa, animação, estado e feedback que obrigaram a novas decisões de design. Essas decisões melhoraram a clareza do sistema e aproximaram o protótipo de uma experiência móvel credível.

O protótipo cumpre os requisitos funcionais centrais do enunciado: usa toque, localização e acelerómetro; oferece múltiplos tipos de feedback; tem fluxos funcionais; inclui logging de interações; e está preparado para testes de usabilidade com exportação de dados quantitativos.

TODO - completar a conclusão com uma frase sobre os resultados reais dos testes de usabilidade depois de preencher as secções 10 e 11.

---

# Anexos

## Anexo A - Linha temporal de screenshots

TODO - inserir sequência de screenshots/fotografias:

1. protótipo em papel;
2. protótipo Figma inicial;
3. protótipo Figma refinado;
4. primeira implementação do mapa;
5. primeira implementação da lista;
6. iteração do Shake to Discover;
7. evolução do perfil;
8. versão final.

## Anexo B - Script de teste de usabilidade

### Nota inicial ao participante

TODO - adaptar texto final usado.

> Obrigado por participares neste teste. O objetivo é avaliar o protótipo da aplicação, não avaliar o teu desempenho. Podes parar a qualquer momento. Durante as tarefas, peço-te que digas em voz alta o que estás a pensar, o que esperas que aconteça e qualquer dúvida que surja. Os dados serão tratados anonimamente.

### Tarefas

1. Abre o mapa e encontra um evento que pareça interessante.
2. Abre o detalhe desse evento e identifica data, local e preço.
3. Guarda ou adere ao evento.
4. Usa Shake to Discover para receber recomendações.
5. Vai ao perfil e abre uma memória de um evento frequentado.
6. Alterna entre vista de lista e mapa.

### Perguntas pós-tarefa

TODO - inserir questionário final.

Sugestões:

- De 1 a 5, quão fácil foi completar a tarefa?
- O que esperavas que acontecesse?
- Houve algum momento confuso?
- O feedback do sistema foi claro?

## Anexo C - Esquema dos logs de interação

O protótipo exporta logs com campos úteis para análise quantitativa:

| Campo             | Significado                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `sessionId`       | identifica a sessão                                              |
| `participantId`   | identifica anonimamente o participante                           |
| `taskId`          | identifica a tarefa em curso                                     |
| `timestamp`       | momento da interação                                             |
| `elapsedMs`       | tempo desde início da sessão                                     |
| `action`          | ação registada                                                   |
| `actionCategory`  | categoria da ação                                                |
| `interactionType` | tipo de interação, como click, navigation, sensor ou screen_view |
| `screen`          | ecrã onde a ação ocorreu                                         |
| `route`           | rota associada                                                   |
| `eventId`         | evento relacionado, quando aplicável                             |
| `experienceId`    | experiência relacionada, quando aplicável                        |
| `targetLabel`     | alvo clicado ou fonte da ação                                    |
| `taskElapsedMs`   | tempo desde início da tarefa                                     |
| `taskDurationMs`  | duração final da tarefa, quando aplicável                        |

TODO - inserir excerto real de CSV ou JSON exportado, com dados anonimizados.

## Anexo D - Screenshots adicionais

TODO - inserir screenshots que não couberam no corpo principal:

- menus contextuais de pin;
- menus contextuais de cartão;
- estado vazio de Saved;
- painel Interaction Logs;
- botões de participação;
- mini-mapa do detalhe;
- mapa do perfil;
- estados de erro ou fallback de localização.

## Anexo E - Repositório e instruções de execução

**Repositório:** <https://github.com/zmmartins/event-discovery-app.git>

### Instalação

```bash
npm install
```

### Arranque

```bash
npm run start
```

### Execução em dispositivo

Usar Expo Go ou um build nativo iOS/Android. A validação deve ser feita em dispositivo móvel, porque o protótipo depende de mapa nativo, localização, haptics e sensores.

### Scripts úteis

```bash
npm run ios
npm run android
npm run lint
npm run unused
```

TODO - inserir versão final de Node/Expo usada na máquina de demonstração, se for relevante para reprodução.
