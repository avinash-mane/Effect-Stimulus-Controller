import { Controller } from '@hotwired/stimulus'
/**
 * Helper for state efects
 */

const CONDITIONAL_PATTERN = /\s*(==|!=|!)\s*/;
const LOGICAL_PATTERN = /\s*\|\|\s*|\s*&&\s*/;
const LOGICAL_OPERATOR_PATTERN = /(&&|\|\|)/g;
const LOGICAL_SEPRATOR_PATTERN = /\s*(&&|\|\|)\s*/;

const HIDDEN_CLASS = "bs-d-none"
const DISABLE_CLASS = "bs-ui-disabled"

const isEqual = (a, b) => a == b;
const isNotEqual = (a, b) => a != b;
const isNot = (a) => !a;
const isOr = (a, b) => a ||b;
const isAnd = (a, b) => a && b;

const callBacks = {
    "==": isEqual,
    "!=": isNotEqual,
    "!": isNot,
    "&&": isAnd,
    "||": isOr
}
export default class extends Controller {

    static targets = ["input", "select"];

    connect(){
        //change state or check validation on load 
        this.init.call(this)

        //add event listener on select tag if the element register any effect
        this.selectTargets.forEach(input => {
            if(this.isEffectRegistred(input.name))
                input.addEventListener('change', this.handleInputChange.bind(this));
        });

        //add event listener on all input component if the element regster any effect
        this.inputTargets.forEach(input => {
            if(this.isEffectRegistred(input.name))
                input.addEventListener('input', this.handleInputChange.bind(this));
        });
    }

    disconnect(){
        //remove event listener on select tag if the element register any effect
        this.selectTargets.forEach(input => {
            if(this.isEffectRegistred(input.name))
                input.removeEventListener('change');
        });

        //remove event listener on all input component if the element regster any effect
        this.inputTargets.forEach(input => {
            if(this.isEffectRegistred(input.name))
                input.removeEventListener('input');
        });
    }

    init(){
        //show elements
        this.changeClass(this.element.querySelectorAll(`[data-show]`), HIDDEN_CLASS, "show")

        //hide elements
        this.changeClass(this.element.querySelectorAll(`[data-hide]`), HIDDEN_CLASS, "hide")

        //disable elements
        this.changeClass(this.element.querySelectorAll(`[data-disable]`), DISABLE_CLASS, "disable")

        //update state
        let valueElements = this.element.querySelectorAll(`[data-state]`)
        valueElements.forEach(item=>{
            item.innerHTML = this.element.querySelector(`[name="${item.dataset.state}"]`)?.value;
        })
    }

    handleInputChange({ target }) {
        let { name, value, checked} = target
        if(target.type == "checkbox")  value = checked.toString()

        //show elements
        this.changeClass(this.getShowTargets(name), HIDDEN_CLASS, "show", value)

        //hide elements
        this.changeClass(this.getHideTargets(name), HIDDEN_CLASS, "hide", value)

        //disable elements
        this.changeClass(this.getDisableTargets(name), DISABLE_CLASS, "disable", value)

        //update state
        let valueElements = this.getStateTargets(name)
        valueElements.forEach(item=>item.innerHTML= value)
    }

    changeClass(elements, className, key, value){
        elements.forEach(item=>{
            let condition = item.dataset[key]
            let isValid = false
            if(condition.includes("(")){
                let evaluateStr =  this.evaluate(condition, value)
                let conditionArray = evaluateStr.split(LOGICAL_SEPRATOR_PATTERN)
                let resultOutput =""
                conditionArray.forEach(i => {
                    if(["(true)", "(false)", "||", "&&"].includes(i)){
                        resultOutput+=i
                    }else{
                        resultOutput+=this.validate(i, value)
                    }
                })
                isValid = eval(resultOutput)
            }else{
                isValid =  this.validate(condition, value)
            }
            
            //in show check remove bs-d-none class
            if(key == "show") isValid ? this.removeClass(item, className) : this.addClass(item, className)

            //in hide check add bs-d-none class
            //in disable check add bs-ui-disabled class
            if(key == "disable" ||  key == "hide") isValid ? this.addClass(item, className) : this.removeClass(item, className)
        })
    }

    evaluate(condition, value){
        let str = ""
        for(let i = 0 ; i < condition.length; ){
            let subCondition = ""
            if(condition.charAt(i) == "("){
                for(let j = i+1 ; j < condition.length; j++){
                    i++
                    if(condition.charAt(j) == ")"){
                        this.validate(subCondition, value)
                        str+= "(" + this.validate(subCondition, value)
                        break;
                    }else{
                        subCondition+=condition.charAt(j)
                    }
                }
            }else{
                str+= condition.charAt(i)
                i++
            }
        }
        return str
    }

    validate(condition, value){
        let conditions =condition.split(LOGICAL_PATTERN)
        let operators = condition.match(LOGICAL_OPERATOR_PATTERN)
        if(!operators) return this.checkIsValid(conditions[0], value)
        let result = this.checkIsValid(conditions[0], value) 
        operators.forEach((op, index)=>{
            let nextResult = this.validate(conditions[index + 1], value)
            result = callBacks[op](result, nextResult);
        })
        return result
    }


    checkIsValid(condition, value){
        let [name, operator, dataValue] = condition.split(CONDITIONAL_PATTERN);
        // value is null means checking state and validation on onload
        if(!value || !condition.contains(value)){
            let target = this.element.querySelector(`[name="${name}"]`)
            if(target?.type == "radio"){
                 target = this.element.querySelector(`[name="${name}"]:checked`)
                 value = target ? target.value : "false"
            }else{
                value = target.type == "checkbox" ? target.checked.toString() : target.value;
            }
        }
        //if qoutes and empty sapces removed
        dataValue = dataValue.trim().replace(/^['"](.*)['"]$/, '$1')
        return callBacks[operator](value, dataValue)
    }

    get inputTargets() {
        return this.element.querySelectorAll('input');
    }

    get selectTargets() {
        return this.element.querySelectorAll('select');
    }

    addClass(element, className){
        element?.classList.add(className)
    }

    removeClass(element, className){
        element?.classList.remove(className)
    }

    isEffectRegistred(name){
        return Boolean(this.getHideTargets(name).length) ||  Boolean(this.getShowTargets(name).length) || Boolean(this.getStateTargets(name).length) || Boolean(this.getDisableTargets(name).length)
    }

    getShowTargets(name){
        return this.element.querySelectorAll(`[data-show*="${name}"]`)
    }

    getHideTargets(name){
        return this.element.querySelectorAll(`[data-hide*="${name}"]`)
    }

    getStateTargets(name){
        return this.element.querySelectorAll(`[data-state*="${name}"]`)
    }

    getDisableTargets(name){
        return this.element.querySelectorAll(`[data-disable*="${name}"]`)
    }
}
