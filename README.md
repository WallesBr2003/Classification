# 🦁 Classificador de Animais · IA

Uma aplicação web que utiliza Inteligência Artificial para identificar animais a partir de imagens — via upload ou webcam em tempo real.

![HTML](https://img.shields.io/badge/HTML-18%25-orange)
![CSS](https://img.shields.io/badge/CSS-35%25-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-43%25-yellow)
![PowerShell](https://img.shields.io/badge/PowerShell-4%25-lightgrey)

---

## 📋 Sobre o Projeto

O **Classificador de Animais** é uma aplicação front-end que carrega um modelo de machine learning treinado com o [Teachable Machine](https://teachablemachine.withgoogle.com/) do Google e realiza inferências diretamente no navegador usando **TensorFlow.js**. Nenhum dado é enviado para servidores externos — tudo roda localmente no cliente.

---

## 🐾 Classes Suportadas

O modelo reconhece **9 classes** de animais:

| Emoji | Animal     |
|-------|------------|
| 🐶    | Cachorro   |
| 🐴    | Cavalo     |
| 🐘    | Elefante   |
| 🦋    | Borboleta  |
| 🐔    | Galinha    |
| 🐱    | Gato       |
| 🐄    | Vaca       |
| 🐑    | Ovelha     |
| 🕷️    | Aranha     |

---

## ✨ Funcionalidades

- **Upload de imagem** — arraste e solte ou selecione um arquivo (PNG, JPG, WEBP)
- **Webcam ao vivo** — classificação em tempo real capturando frames da câmera
- **Painel de Avaliação** — métricas completas do modelo com o Princípio de Pareto (80/20):
  - Acurácia, Precisão, Recall e F1-Score globais
  - Métricas individuais por classe
  - Matriz de Confusão interativa
  - Exportação de relatório em JSON
- **Interface responsiva** — funciona em desktop e dispositivos móveis

---

## 🗂️ Estrutura do Projeto

```
Classification/
├── index.html       # Interface principal da aplicação
├── style.css        # Estilos e animações da UI
├── app.js           # Lógica de classificação, webcam e avaliação
├── model.json       # Arquitetura do modelo (Teachable Machine)
├── weights.bin      # Pesos treinados do modelo
├── metadata.json    # Metadados das classes do modelo
└── serve.ps1        # Script PowerShell para servidor local
```

---

## 🚀 Como Executar

### Pré-requisito

Por conta das políticas de CORS dos navegadores, o projeto precisa ser servido via HTTP (não via `file://`).

### Opção 1 — PowerShell (Windows)

```powershell
.\serve.ps1
```

### Opção 2 — Python

```bash
# Python 3
python -m http.server 8080
```

Acesse `http://localhost:8080` no navegador.

### Opção 3 — Node.js

```bash
npx serve .
```

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Uso |
|---|---|
| [TensorFlow.js](https://www.tensorflow.org/js) `v1.3.1` | Inferência do modelo no navegador |
| [Teachable Machine Image](https://teachablemachine.withgoogle.com/) `v0.8` | Wrapper de alto nível para o modelo |
| [Google Fonts — Inter](https://fonts.google.com/specimen/Inter) | Tipografia da interface |
| HTML5 / CSS3 / JavaScript | Base da aplicação |

---

## 📊 Painel de Avaliação

O painel de **Avaliação** permite medir a performance do modelo com suas próprias imagens de teste:

1. Faça upload de imagens rotuladas por classe (recomendado ~20% dos dados)
2. Clique em **Avaliar Modelo**
3. Visualize as métricas globais e por classe
4. Analise a **Matriz de Confusão** para entender os erros
5. Exporte o relatório completo em **JSON**

---

## 📄 Licença

Este projeto está disponível como open source. Sinta-se à vontade para utilizar, modificar e distribuir.

---

> Desenvolvido por [WallesBr2003](https://github.com/WallesBr2003)
