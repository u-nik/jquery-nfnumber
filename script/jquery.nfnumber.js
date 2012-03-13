/**
 * @author Niklas Funke <niklas.funke@gmail.com>
 * @date: 13.03.12
 * @version 0.3
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
        max:null,
        /** @var numeric Allgemeiner Minimalwert */
        min:null,
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
         * Hält einen Eventhandler, welcher ausgeführt wird, wenn sich der Wert
         * eines Feldes ändert. Liefert der Handler einen Wert zurück, wird
         * dieser anstelle des eigentlichen Werten verwendet.
         *
         * function(value, settings){}
         *
         * @var function
         */
        change:null,
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
        invalidValue:0
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

            // Vorhandene
            methods.destroy();

            // Handler neu an Events binden.
            $this.on('change.nfnumber', settings, handler.change);
            $this.on('blur.nfnumber', settings, handler.change);
            $this.on('keydown.nfnumber', settings, handler.keydown);
            $this.on('create.nfnumber', settings, settings.create);
            $this.on('destroy.nfnumber', settings, settings.destroy);

            // Hiddenfields erzeugen für reele werten.
            if (settings.formmode == 'raw') {
                $this.each(function (i, e) {
                    var $e = $(e);
                    var $h = $e.clone(false).attr('type', 'hidden')
                        .addClass('nfnumber-hidden');
                    $e.after($h).data('nfnumber', {'hidden':$h});
                });
            }

            // Eingabefelder formatieren.
            if (settings.initformat) {
                $this.trigger('change.nfnumber', true);
            }

            $this.trigger('oncreate.nfnumber');

            return this;
        },
        /**
         * Entfernt alle Eventhandler von den Elemente. Aufruf über
         * "$(selector).nfnumber('destroy');".
         * @return jQuery selected Element
         */
        destroy:function () {
            var $this = $(this);

            // Hiddenfields erzeugen für reele werten.
            $this.each(function (i, e) {
                var $e = $(e);
                var data = $e.data('nfnumber');
                if (data != undefined && data.hidden) {
                    var $h = data.hidden;
                    $e.attr('name', $h.attr('name')).val($h.val());
                    $e.getNumber = function() {
                        return methods.toFloat(this.value);
                    };
                    $h.remove();
                    $e.removeData('nfnumber');
                }
            });

            $this.trigger('ondestroy.nfnumber');

            // Vorhandene Eventhandler entfernen.
            $this.off('.nfnumber', handler.change);

            return this;
        },
        /**
         * Liefert den Wert des Eingabefeldes.
         * @return string
         */
        value:function(){
            var $e = $(this);
            var d = $e.data('nfnumber');
            if (d != undefined && d.hidden != undefined) {
                return d.hidden.val();
            } else {
                return $(this).val();
            }
        }
    };

    // Hilfsmethoden.
    var helper = {
        /**
         * Erzeugt automatisch den kleinsten Schritt anhand der übergebenen
         * Genauigkeit wenn kein Schritt definiert wurde.
         * @param s NFNumber Einstellungen.
         */
        setStep:function (s) {
            if (s.step == 0 && s.precision > 0) {
                s.step = 1 / Math.pow(10, s.precision);
            }
        },
        /**
         * Rundet den angegebenen Wert auf die angegebene Genauigkeit.
         * @param value
         * @param precision
         */
        round:function (value, precision) {
            // Runden
            var f = Math.pow(10, precision);
            value = Math.round(value * f) / f;

            return value;
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
         * Normalisiert den Wert anhand der übergebenen Einstellungen.
         * @param v float Wert
         * @param s object NFNumber Einstellungen
         */
        normalize:function (v, s) {
            variables.reachedMax = false;
            variables.reachedMin = false;

            // Auf Schrittgröße runden und Javascript Rundungsfehler kompensieren
            v = Math.ceil(helper.round(v / s.step, s.precision)) * s.step;
            v = helper.round(v, s.precision);
            var tempVar = v;

            // Zahl auf Minimum erhöhen oder Maximum absenken wenn erforderlich.
            v = s.max != null ? Math.min(v, s.max) : v;
            v = s.min != null ? Math.max(v, s.min) : v;

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
         * Formatiert eine Zahl in einen String anhand des gegebenen Formates.
         * @param flt Float, Double oder Integerzahl
         * @param settings NFNumber Einstellungen
         * @return string
         */
        toString:function (flt, settings) {
            var retval = "",
                p = settings.precision;

            // Runden
            flt = helper.round(flt, p);
            var str = "" + flt;

            // Komma ermittlen
            var decIndex = str.indexOf(".");

            // fehlende Nullen einfügen
            str += (decIndex == -1 ? "." : "" )
                + Math.pow(10, p).toString().substring(1);

            // Ist die Zahl negativ und darf sie auch so dargestellt werden?
            var neg = flt < 0;

            if (neg) {
                // Führendes "-" wegschneiden. Stört erstmal nur.
                str = str.substring(1);
            }

            decIndex = str.indexOf(".");

            // Nachkommastellen ermittlen
            if (decIndex == -1) {
                decIndex = str.length;
            } else {
                retval = settings.decsign + str.substr(decIndex + 1, p);
            }

            while (decIndex > 0) {
                if (decIndex - 3 > 0) {
                    retval = settings.seperator
                        + str.substring(decIndex - 3, decIndex) + retval;
                } else {
                    retval = str.substring(0, decIndex) + retval;
                }

                decIndex -= 3;
            }

            return settings.prefix
                + (neg ? "-" : "") + retval
                + settings.suffix;
        },
        /**
         * Parsed einen String in eine Zahl anhand des gegebenen Formates.
         * @param s Stringdarstellung einer Zahl
         * @param sett NFNumber Einstellungen
         * @return float
         */
        toFloat:function (s, sett) {

            if (typeof s == 'string') {
                if (sett.prefix != '') {
                    s = helper.replace(sett.prefix, '', s);
                }

                if (sett.suffix != '') {
                    s = helper.replace(sett.suffix, '', s);
                }

                if (sett.seperator != '' && s.indexOf(sett.seperator) != -1) {
                    s = helper.replace(sett.seperator, "", s);
                }

                if (sett.decsign != '.' && s.indexOf(sett.decsign) != -1) {
                    s = helper.replace(sett.decsign, ".", s);
                }
            } else {
                s = "0";
            }

            var flt = parseFloat(s);

            // Float gefunden? Wenn ja, Float liefern, sonst 0
            if (flt == Number.NaN) {
                $.error('Invalid Number: ' + s);
                return 0;
            }

            return flt;
        },
        /**
         * Schreibt den veränderten Wert zurück in die Eingabefelder. Ggf.
         * werden gesetzte Events abgefeuert.
         * @param $input jQuery Referenz auf das Eingabefeld.
         * @param value Wert
         * @param s NFNumbers Einstellungen.
         */
        changeValue:function($input, value, s) {

            // Wert normalisieren.
            value = helper.normalize(value, s);

            if (s.formmode == 'raw') {
                $(s.nfnumber.hidden).val(value);
            }

            // Event vor Änderung der Daten mit der Möglichkeit des Eingriffs.
            if (typeof s.change == 'function') {
                var eventret = s.change.call($input, value, s);
                if ($.isNumeric(eventret)) {
                    value = eventret;
                }
            }

            // Daten ändern
            $input.val(helper.toString(value, s));

            if (variables.reachedMax && s.reachmax != null) {
                s.reachmax.call($input, value, variables.invalidValue, s);
            } else if (variables.reachedMin && s.reachmin != null) {
                s.reachmin.call($input, value, variables.invalidValue, s);
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

            // Standarddaten überschreiben
            var settings = $.extend({}, e.data, $input.data());
            helper.setStep(settings);

            if (init != undefined && settings.formmode == 'raw') {
                // Wert einfach übernehmen da korrekter Zahlenwert.
                value = Math.max(parseFloat($input.val()), settings.min);

            } else {
                // Wert des Eingabefeldes aus String parsen.
                value = helper.toFloat($input.val(), settings);
            }

            helper.changeValue($input, value, settings);
            return false;
        },
        /**
         * onKeydown Handler. Er verändert den Wert des Feldes anhand von
         * Tastenkombinationen.
         * @param e jQuery Event Object
         */
        keydown:function (e) {
            var $input = $(this);

            // Standarddaten überschreiben
            var d = $.extend({}, e.data, $input.data());
            helper.setStep(d);

            // Wert des Eingabefeldes parsen.
            var value = helper.toFloat($input.val(), d);
            var vprev = value;
            var retval = false;

            switch (e.which) {
                case 38: // Up
                    // Wert inkrementieren.
                    if (e.shiftKey) {
                        value = value + (d.shiftmulti * d.step);
                    } else {
                        value = value + d.step;
                    }
                    // Javascript Rundungsfehler kompensieren
                    value = helper.round(value, d.precision);
                    break;

                case 40: // Down
                    // Wert dekrementieren
                    if (e.shiftKey) {
                        value = value - (d.shiftmulti * d.step);
                    } else {
                        value = value - d.step;
                    }
                    // Javascript Rundungsfehler kompensieren
                    value = helper.round(value, d.precision);
                    break;

                case 32: // Leerzeichen
                    // Zurücksetzen auf 0
                    if (e.shiftKey) {
                        value = d.min != null ? d.min : 0;
                    } else {
                        value = d.max != null ? d.max : 0;
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
                    if (!e.shiftKey) {
                        if (e.which >= 48 && e.which <= 57) {
                            // Zahlen im Hauptfeld
                            return true;
                        } else if (e.which >= 96 && e.which <= 105) {
                            // Zahlen auf Numpad.
                            return true;
                        } else if (e.which == 110 || e.which == 188) {
                            // Komma, Komma
                            return true;
                        } else if (e.which == 190 || e.which == 189) {
                            // Punkt und Bindestrich
                            return true;
                        }
                    }
                    console.log(e.which);
                    return false;
            }

            // Wert darf Max nicht über- oder 0 unterschreiten.
            if (value != vprev) {
                helper.changeValue($input, value, d);
            }

            return retval;
        }
    };

    // Hauptmethode
    $.fn.nfnumber = function (method) {
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