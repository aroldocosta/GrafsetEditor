class Transition {
    /**
     * Cria uma nova Transição
     * @param {Object} params
     * @param {string} params.id - Identificador único
     * @param {boolean} [params.triggered=false] - Se a transição está acionada
     * @param {string} [params.receptivity=''] - Expressão de receptividade
     * @param {Array<Step>} [params.inputSteps=[]] - Steps de entrada
     * @param {Array<Step>} [params.outputSteps=[]] - Steps de saída
     * @param {string} [params.description=''] - Descrição da transição
     */
    constructor({
      id,
      triggered = false,
      receptivity = '',
      inputSteps = [],
      outputSteps = [],
      description = ''
    }) {
      this.id = id;
      this.triggered = triggered;
      this.receptivity = receptivity;
      this.inputSteps = inputSteps;
      this.outputSteps = outputSteps;
      this.description = description;
    }
  
    setTriggered(newState) {
      this.triggered = newState;
    }
  
    setReceptivity(expr) {
      this.receptivity = expr;
    }
  
    setDescription(desc) {
      this.description = desc;
    }
  
    addInputStep(step) {
      this.input_steps.push(step);
    }
  
    addOutputStep(step) {
      this.output_steps.push(step);
    }
  
    removeInputStep(step) {
      this.input_steps = this.input_steps.filter(s => s !== step);
    }
  
    removeOutputStep(step) {
      this.output_steps = this.output_steps.filter(s => s !== step);
    }
  }
  