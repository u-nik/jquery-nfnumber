/**
 * @author Niklas Funke <niklas.funke@gmail.com>
 * @date: 16.03.12
 * @version 0.4
 *
 * Copyright (c) 2012, Niklas Funke
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function ($) {

    // Einstellungen
    var defaultSettings = {
        /** @var int Genauigkeit (Anzahl Kommastellen) */
        precision:2,
        /** @var numeric Schritt bei Inkrementierung oder Dekrementierung */
        step:0,
        /** @var numeric Allgemeiner Maximalwert */
        max:Math.pow(2,50),
        /** @var numeric Allgemeiner Minimalwert */
        min:-Math.pow(2,50),
        /** @var string Dezimaltrennzeichen */
        decsign:'.',
        /** @var string Tausendertrennzeichen */
        seperator:'',
        /** @var numeric Multiplikator der Schritte bei gedrückter Shifttaste */
        shiftmulti:100,
        /** @var bool Formatiert alle Eingabefelder bei Initialisierung */
        initformat:true,
        /** @var string Prefix */
        prefix:'',
        /** @var string Suffix */
        suffix:'',
        /**
         * Definiert das Ein- und Ausgabeformat der Feldwerte in einem Formular.
         *  "raw":          Werte werden als systemmatische Zahlen interpretiert
         *                  und ausgegeben.
         *                  Eingabe -> Anzeige -> Ausgabe
         *                  1000.00 -> 1.000,00 -> 1000.00
         *  "formatted":    Werte werden als formatierte Zahlen interpretiert
         *                  und ausgegeben.
         *                  Eingabe -> Anzeige -> Ausgabe
         *                  1.000,00 -> 1.000,00 -> 1.000,00
         * @var string
         */
        formmode:'raw',
        /**
         * Hält einen Eventhandler, welcher ausgeführt wird, wenn der Wert
         * eines Feldes manuell geändert wird. Liefert der Handler einen Wert
         * zurück, wird dieser anstelle des eigentlichen Werten verwendet.
         *
         * function(value, settings){}
         *
         * @var function
         */
        change:null,
        /**
         * Wird gefuert, wenn der aktualisierungsprozess eines Feldes
         * abgeschlossen wurde. Große Veränderung im DOM Baum sollten durch
         * dieses Event angestoßen werden.
         *
         * function(value, settings){}
         *
         * @var function
         */
        update:null,
        /**
         * Hält einen Eventhandler, welcher ausgeführt wird, wenn sich der Wert
         * eines Feldes geändert hat.
         *
         * @var function
         */
        create:function(){},
        /**
         * Hält einen Eventhandler, welcher ausgeführt wird, wenn sich der Wert
         * eines Feldes geändert hat.
         *
         * @var function
         */
        destroy:function(){},
        /**
         * Wird ausgeführt, wenn der Maximalwert erreicht wurde.
         */
        reachmax:null,
        /**
         * Wird ausgeführt, wenn der Minimalwert erreicht wurde.
         */
        reachmin:null
    };

    /**
     * Hält interne Daten.
     */
    var variables = {
        reachedMax:false,
        reachedMin:false,
        invalidValue:0,
        keyupEvent:false
    };

    // Mögliche Methoden.
    var methods = {
        /**
         * Initialisiert die Nummernformatierung.
         * @param options NFNumber Benutzereinstellungen
         * @return jQuery selected Element
         */
        init:function (options) {
            var $this = $(this);

            // Benutzereinstellungen übernehmen.
            var settings = $.extend({}, defaultSettings, options);
            helper.setStep(settings);

            // Vorhandene Konfigurationen und Handler entfernen.
            helper.destroy.call(this);

            // Handler neu an Events binden.
            $this.on('change.nfnumber', handler.change);
            $this.on('keydown.nfnumber', handler.keydown);
            $this.on('destroy.nfnumber', settings, settings.destroy);
            $this.on('keyup.nfnumber', handler.keyup);

            // Hiddenfields erzeugen für reele werten.
            $this.each(function (i, e) {
                var $e = $(e), data = {hidden:null};

                if (settings.formmode == 'raw') {
                    var $h = $(document.createElement('input')).attr({
                        type: 'hidden', name: $e.attr('name'), value: $e.val()
                    });
                    data.hidden = $h;
                    $e.after($h);
                }

                data = $.extend({}, settings, $e.data(), data);
                helper.setStep(data);
                $e.data('nfnumber', data);
//                 $e.data('nfformat', $.nfFormat(data));
            });

            // Eingabefelder formatieren.
            if (settings.initformat) {
                $this.trigger('change.nfnumber', true);
            }

            // Createevent
            if (typeof settings.create == 'function') {
                settings.create.call(this, settings);
            }

            return this;
        },
        /**
         * Entfernt alle Eventhandler von den Elemente. Aufruf über
         * "$(selector).nfnumber('destroy');".
         * @return jQuery selected Element
         */
        destroy:function () {
            $(this).trigger('destroy.nfnumber');
            helper.destroy.call(this);

            return this;
        },
        /**
         * Liefert oder Setzt den Wert des Eingabefeldes.
         * @param value (optional) Wert, der gesetzt werden soll.
         * @return string|{object} Wert oder jQuery Elementreferenz
         */
        value:function(value){
            var $input = $(this);
            var data = $input.data('nfnumber');

            if (data != undefined) {
                // NFNumber activated.
                if (value != undefined) {
                    if (data.formmode != 'raw') {
                        value = helper.toFloat(value, data);
                    }

                    // Wert ändern.
                    helper.changeValue($input, value, data);
                    return this;
                }

                // Wert liefern
                return data.hidden != null
                    ? data.hidden.val()
                    : $input.val();

            } else {
                // NFNumber deactivated
                if (value != undefined) {
                    // Wert ändern
                    $input.val(value);
                    return this;
                }

                return $input.val();
            }
        }
    };

    // Hilfsmethoden.
    var helper = {
        /**
         * Entfernt NFNumbers von allen selektierten Elementen.
         */
        destroy:function(){
            var $this = $(this);

            // Hiddenfields erzeugen für reele werten.
            $this.each(function (i, e) {
                var $e = $(e);
                var data = $e.data('nfnumber');

                if (data != undefined && data.hidden != null) {
                    var $h = data.hidden;
                    $e.attr('name', $h.attr('name')).val($h.val());
                    $e.getNumber = function() {
                        return methods.toFloat(this.value);
                    };
                    $h.remove();
                    $e.removeData('nfnumber');
                }
            });

            // Vorhandene Eventhandler entfernen.
            $this.off('.nfnumber', handler.change);
        },
        /**
         * Erzeugt automatisch den kleinsten Schritt anhand der übergebenen
         * Genauigkeit wenn kein Schritt definiert wurde.
         * @param data NFNumber Einstellungen.
         */
        setStep:function (data) {
            if (data.step == 0 && data.precision > 0) {
                data.step = 1 / Math.pow(10, data.precision);
            }
        },
        /**
         * Einfache String Replace Implementation ohne RegExp.
         * @param search Zu ersetzender String
         * @param replace Ersatzstring
         * @param subj String in dem gesucht und ersetzt wird
         * @return string Fertig ersetzter String
         */
        replace:function (search, replace, subj) {
            return subj.split(search).join(replace);
        },
        /**
         * Rundet den angegebenen Wert auf die angegebene Genauigkeit.
         * @param value
         * @param precision
         */
        round:function (value, precision) {
            // Runden
            var f = Math.pow(10, precision);
            var v = value * f;
            v = Math.round(v);
            v /= f;
            value = Math.round(value * f) / f;

            return value;
        },
        /**
         * Normalisiert den Wert anhand der übergebenen Einstellungen.
         * @param v float Wert
         * @param s object NFNumber Einstellungen
         */
        normalize:function (v, s) {
            variables.reachedMax = false;
            variables.reachedMin = false;

            // Auf Schrittgröße runden und Javascript Rundungsfehler kompensieren
            var v1 = v / s.step;
            v1 = helper.round(v1, s.precision);
            v1 = Math.ceil(v1);
            v = v1 * s.step;
//            v = Math.ceil(helper.round(v / s.step, s.precision)) * s.step;
//            v = helper.round(v, s.precision);
            var tempVar = v;

            // Zahl auf Minimum erhöhen oder Maximum absenken wenn erforderlich.
            v = Math.min(v, s.max);
            v = Math.max(v, s.min);

            if (tempVar < v) {
                variables.reachedMin = true;
                variables.invalidValue = tempVar;
            } else if (tempVar > v) {
                variables.reachedMax = true;
                variables.invalidValue = tempVar;
            }

            return v;
        },
        /**
         * Fügt dem String 0en an den Anfang an, wenn die Länge nicht der
         * angegebenen entspricht.
         * @param string
         * @param length
         */
        prepandZeros:function(string, length) {
            while (string.length < length) {
                string = "0" + string
            }
            return string;
        },
        /**
         * Formatiert eine Zahl in einen String anhand des gegebenen Formates.
         * @param value Float, Double oder Integerzahl
         * @param data NFNumber Einstellungen
         * @return string
         */
        toString:function (value, data) {
            var precision = data.precision, parts = [], part, isNegativ, string,
                fraction, number, divider = 1000;

            // Bestimmen ob Zahl negativ ist, und dann positiv machen.
            isNegativ = value < 0;
            value = Math.abs(value);

            // Get fractional numbers
            number = parseInt(value);
            if (precision > 0) {
                fraction = "" + Math.round((value - number) * Math.pow(10, precision));
                fraction = helper.prepandZeros(fraction, precision);
            }

            // ... number greater then 0
            while (number > 0) {
                part = number / divider;
                part = "" + Math.round((part - parseInt(part)) * divider);

                // prepend zeros to numberpart if necessary.
                if (number >= divider) {
                    part = helper.prepandZeros(part, 3);
                }
                parts[parts.length] = part;

                // reduce number by partsize
                number = parseInt(number / divider);
            }

            // assemble string number.
            if (parts.length == 0) {
                string = "0";
            } else {
                string = parts.reverse().join(data.seperator);
            }

            // add fraction if precision greater then 0...
            if (precision > 0) {
                string += data.decsign + fraction;
            }

            return data.prefix + (isNegativ ? "-" : "") + string + data.suffix;
        },
        /**
         * Parsed einen String in eine Zahl anhand des gegebenen Formates.
         * @param value Stringdarstellung einer Zahl
         * @param data NFNumber Einstellungen
         * @return float
         */
        toFloat:function (value, data) {

            if (typeof value == 'string') {
                if (data.prefix != '') {
                    value = helper.replace(data.prefix, '', value);
                }

                if (data.suffix != '') {
                    value = helper.replace(data.suffix, '', value);
                }

                if (data.seperator != '' && value.indexOf(data.seperator) != -1) {
                    value = helper.replace(data.seperator, "", value);
                }

                if (data.decsign != '.' && value.indexOf(data.decsign) != -1) {
                    value = helper.replace(data.decsign, ".", value);
                }
            } else {
                value = "0";
            }

            var flt = parseFloat(value);

            // Float gefunden? Wenn ja, Float liefern, sonst 0
            if (flt == Number.NaN) {
                $.error('Invalid Number: ' + value);
                return 0;
            }

            return flt;
        },
        /**
         * Schreibt den veränderten Wert zurück in die Eingabefelder. Ggf.
         * werden gesetzte Events abgefeuert.
         * @param $input jQuery Referenz auf das Eingabefeld.
         * @param value Wert
         * @param data NFNumbers Einstellungen.
         * @return float Normalisierter und gesetzter Wert.
         */
        changeValue:function($input, value, data) {

            // Einstellungen aus Eingabefeld übernehmen wenn nicht angegeben.
            if (data == undefined) {
                data = $input.data('nfnumber');
            }

            // Wert normalisieren.
            value = helper.normalize(value, data);

            if (data.formmode == 'raw') {
                data.hidden.val(value);
            }

            // Daten ändern
            $input.val(helper.toString(value, data));

            if (variables.reachedMax && data.reachmax != null) {
                data.reachmax.call($input, value, variables.invalidValue, data);
            } else if (variables.reachedMin && data.reachmin != null) {
                data.reachmin.call($input, value, variables.invalidValue, data);
            }

            return value;
        },
        /**
         * Führt das Update Event aus.
         * @param $input
         * @param value
         * @param data
         */
        fireUpdateEvent:function($input, value, data) {
            // Event vor Änderung der Daten mit der Möglichkeit des Eingriffs.
            if (typeof data.update == 'function') {
//                console.log('NFNumber: fire update event');
                data.update.call($input, value, data);
            }
        }
    };

    // Eventhandler.
    var handler = {
        /**
         * onChange Handler. Er Formatiert den Text nach der Eingabe neu.
         * @param e jQuery Event Object
         */
        change:function (e, init) {
            var $input = $(this), value;
            var data = $input.data('nfnumber');

            if (init != undefined && data.formmode == 'raw') {
                // Wert einfach übernehmen da korrekter Zahlenwert.
                value = Math.max(parseFloat($input.val()), data.min);

            } else {
                // Wert des Eingabefeldes aus String parsen.
                value = helper.toFloat($input.val(), data);
            }

            // Event vor Änderung der Daten mit der Möglichkeit des Eingriffs.
            if (typeof data.change == 'function') {
                data.change.call($input, value, data);
            }

            // Wert übernehmen.
            value = helper.changeValue($input, value, data);

            if (init == undefined) {
                helper.fireUpdateEvent($input, value, data);
            }

            return false;
        },
        /**
         * KeyUP Event, welches nur dann das Update Event abfeuert, wenn das
         * Event durch den keydown Event aktiviert wurde.
         */
        keyup:function() {
            if (variables.keyupEvent) {
                var $input = $(this);
                var data = $input.data('nfnumber');
                var value = helper.toFloat($input.val(), data);

                helper.fireUpdateEvent($input, value, data);
                variables.keyupEvent = false;
            }
            return true;
        },
        /**
         * onKeydown Handler. Er verändert den Wert des Feldes anhand von
         * Tastenkombinationen.
         * @param e jQuery Event Object
         */
        keydown:function (e) {
            var $input = $(this);
            var data = $input.data('nfnumber');
            var value = helper.toFloat($input.val(), data);
            var vprev = value, retval = false, key = e.which, isShift = e.shiftKey;

            switch (key) {
                case 38: // Up
                    // Wert inkrementieren.
                    if (isShift) {
                        value = value + (data.shiftmulti * data.step);
                    } else {
                        value = value + data.step;
                    }
                    // Javascript Rundungsfehler kompensieren
                    value = helper.round(value, data.precision);
                    break;

                case 40: // Down
                    // Wert dekrementieren
                    if (isShift) {
                        value = value - (data.shiftmulti * data.step);
                    } else {
                        value = value - data.step;
                    }
                    // Javascript Rundungsfehler kompensieren
                    value = helper.round(value, data.precision);
                    break;

                case 32: // Leerzeichen
                    // Zurücksetzen auf 0
                    if (!isShift) {
                        value = data.min != Number.MIN_VALUE ? data.min : 0;
                    } else {
                        value = data.max != Number.MAX_VALUE ? data.max : 0;
                    }
                    break;

                case 8: // Rückschritt
                case 9: // Tab
                case 13: // Enter
                case 35: // Pos1
                case 36: // End
                case 37: // Rechts
                case 39: // Links
                case 46: // Entf
                case 107: // +
                case 109: // -
                    return true;

                // Erlaubte Taste mit Shift und verbotener Rest.
                default:
                    if (!isShift) {
                        if (key >= 48 && key <= 57) {
                            // Zahlen im Hauptfeld
                            return true;
                        } else if (key >= 96 && key <= 105) {
                            // Zahlen auf Numpad.
                            return true;
                        } else if (key == 110 || key == 188) {
                            // Komma, Komma
                            return true;
                        } else if (key == 190 || key == 189) {
                            // Punkt und Bindestrich
                            return true;
                        }
                    }
//                    console.log('NFNumber unknown keydown: ' + key);
                    return false;
            }

            // Wert darf Max nicht über- oder 0 unterschreiten.
            if (value != vprev) {
                // Event vor Änderung der Daten mit der Möglichkeit des Eingriffs.
                if (typeof data.change == 'function') {
                    data.change.call($input, value, data);
                }

                helper.changeValue($input, value, data);
                variables.keyupEvent = true;
            }

            return retval;
        }
    };

    // Hauptmethode
    $.fn.nfNumber = function (method) {
        // Method calling logic
        if (methods[method]) {
            return methods[ method ]
                .apply(this, Array.prototype.slice.call(arguments, 1));

        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);

        } else {
            $.error('Method ' + method + ' does not exist on jQuery.nfnumber');
        }

        return this;
    }

})(jQuery);