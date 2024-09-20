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

    static targets = ["input", "select", 'switch'];
    
    connect(){
        //change state or check validation on load 
        this.init.call(this)

        //add event listener on select tag if the element register any effect
        this.selectTargets.forEach(input => {
            if(this.isEffectRegistred(input.name))
                input.addEventListener('change', this.handleInputChange.bind(this));
        });

        //add event listener on all input component if the element register any effect
        this.inputTargets.forEach(input => {
            if(this.isEffectRegistred(input.name))
                input.addEventListener('input', this.handleInputChange.bind(this));
        });

        //add event listener on all switch component if the element register any effect
        this.switchTargets.forEach(input => {
            if(this.isEffectRegistred(input.dataset.switch) && input.getAttribute("target") !== null){
                input.addEventListener('click', this.handleToggle.bind(this));
            }
        });
    }

    disconnect(){
        //remove event listener on select tag if the element register any effect
        this.selectTargets.forEach(input => {
            if(this.isEffectRegistred(input.name))
                input.removeEventListener('change', this.handleInputChange.bind(this));
        });

        //remove event listener on all input component if the element register any effect
        this.inputTargets.forEach(input => {
            if(this.isEffectRegistred(input.name))
                input.removeEventListener('input', this.handleInputChange.bind(this));
        });

        //add event listener on all switch component if the element register any effect
        this.switchTargets.forEach(input => {
            if(this.isEffectRegistred(input.dataset.switch) && input.getAttribute("target") !== null){
                input.removeEventListener('click', this.handleToggle.bind(this));
            }
        });
    }

    init(){
        //show elements
        this.changeClass(this.element.querySelectorAll(`[data-show]`), "show", HIDDEN_CLASS)

        //hide elements
        this.changeClass(this.element.querySelectorAll(`[data-hide]`), "hide", HIDDEN_CLASS)

        //disable elements
        this.changeClass(this.element.querySelectorAll(`[data-disable]`), "disable", DISABLE_CLASS)

        //apply class
        this.changeClass(this.element.querySelectorAll(`[data-classname]`), "classname", "")

        //change attributes
        this.changeClass(this.element.querySelectorAll(`[data-if]`), "if")

        //update state
        let valueElements = this.element.querySelectorAll(`[data-state]`)
        valueElements.forEach(item=>{
            item.innerHTML = this.element.querySelector(`[name="${item.dataset.state}"]`)?.value;
        })
    }

    handleToggle({ target }){
        
        let name = target.dataset?.switch?.trim()
        this.getSwitchTargets(name).forEach(i=>{
            let swithClass = i.dataset.switchClass
            if(swithClass) this.toggleClass(i, swithClass)
            else this.toggleClass(i, HIDDEN_CLASS)
        })

    }

    handleInputChange({ target }) {
        let { name, value, checked} = target
        if(target.type == "checkbox")  value = checked.toString()

        //show elements
        this.changeClass(this.getShowTargets(name), "show", HIDDEN_CLASS, value)

        //hide elements
        this.changeClass(this.getHideTargets(name), "hide", HIDDEN_CLASS, value)

        //disable elements
        this.changeClass(this.getDisableTargets(name), "disable", DISABLE_CLASS, value)

        //apply class
        this.changeClass(this.getClassTargets(name), "classname", "", value)

        //change attributes
        this.changeClass(this.getIfTargets(name), "if", "", value)

        //update state
        let valueElements = this.getStateTargets(name)
        valueElements.forEach(item=>item.innerHTML= value)
    }

    changeClass(elements, key, className, value){
        elements.forEach(item=>{
            let condition = item.dataset[key]
            if(key == "classname" && !className){
                let classConditions = condition.split(",")
                classConditions.forEach(i=>{
                    let [className, expresion] = i.split(":")
                    className = className.trim().replace(/^['"](.*)['"]$/, '$1')?.split(" ")
                    className.forEach(i=>{
                        this.getIsValid( expresion?.trim(), value) ? this.addClass(item, i) : this.removeClass(item, i)
                    })
                })
            }else if(key == "if"){
                let [expresion, conditions] = condition.split("?")
                let isValid = this.getIsValid(expresion?.trim(), value)
                let [validState, inValidState] = conditions.split(":")
                if(isValid){
                    let [name, value]=validState.split("=")
                    item.setAttribute(name.trim(), value.trim().replace(/^['"](.*)['"]$/, '$1'))
                }else{
                    let [name, value]=inValidState.split("=")
                    item.setAttribute(name.trim(), value.trim().replace(/^['"](.*)['"]$/, '$1'))
                }
            }else{
                let isValid = this.getIsValid(condition?.trim(), value)    
                //ishow: remove bs-d-none class
                if(key == "show") isValid ? this.removeClass(item, className) : this.addClass(item, className)
                //disable: add bs-ui-disabled class and  // hide: add bs-d-none class
                if(key == "disable" ||  key == "hide") isValid ? this.addClass(item, className) : this.removeClass(item, className)
            }
        })
    }

    getIsValid(condition, value){
        let isValid = false
        if(condition.includes("(")){
            let evaluateStr =  this.evaluate(condition, value)
            let conditionArray = evaluateStr.split(LOGICAL_SEPRATOR_PATTERN)
            let resultOutput =""
            conditionArray.forEach(i => {
                if(["(true)", "(false)", "||", "&&"].includes(i.trim())){
                    resultOutput+=i
                }else{
                    resultOutput+=this.validate(i, value)
                }
            })
            isValid = new Function("return "+resultOutput)()
        }else{
            isValid =  this.validate(condition, value)
        }
        return isValid
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
            let target = this.element.querySelector(`[name="${name?.trim()}"]`)
            if(target?.type == "radio"){
                 target = this.element.querySelector(`[name="${name?.trim()}"]:checked`)
                 value = target ? target.value : "false"
            }else if(target){
                value = target.type == "checkbox" ? target.checked.toString() : target.value;
            }else{
                return
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

    get switchTargets() {
        return this.element.querySelectorAll('[data-switch]');
    }

    addClass(element, className){
        element?.classList.add(className)
    }

    removeClass(element, className){
        element?.classList.remove(className)
    }

    toggleClass(element, className){
        element?.className.contains(className) ? element?.classList.remove(className) : element?.classList.add(className)
    }

    isEffectRegistred(name){
        return Boolean(this.getHideTargets(name).length) ||  Boolean(this.getShowTargets(name).length) || Boolean(this.getStateTargets(name).length) || Boolean(this.getDisableTargets(name).length) || Boolean(this.getClassTargets(name).length) ||  Boolean(this.getSwitchTargets(name).length) || Boolean(this.getIfTargets(name).length)
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

    getClassTargets(name){
        return this.element.querySelectorAll(`[data-classname*="${name}"]`)
    }

    getSwitchTargets(name){
        return this.element.querySelectorAll(`[data-switch*="${name}"]`)
    }

    getIfTargets(name){
        return this.element.querySelectorAll(`[data-if*="${name}"]`)
    }
}
