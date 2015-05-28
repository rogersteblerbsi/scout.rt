package org.eclipse.scout.rt.ui.html;

import java.util.Arrays;
import java.util.Set;

public class UiTextContributor implements IUiTextContributor {

  @Override
  public void contributeUiTextKeys(Set<String> textKeys) {
    textKeys.addAll(Arrays.asList(
        // From org.eclipse.scout.rt.client
        "ResetTableColumns",
        "ColumnSorting",
        "Column",
        "Cancel",
        // From org.eclipse.scout.rt.ui.html
        "LoadOptions_",
        "NoOptions",
        "OneOption",
        "NumOptions",
        "InvalidDateFormat",
        "EmptyCell",
        "FilterBy_",
        "SearchFor_",
        "TableRowCount0",
        "TableRowCount1",
        "TableRowCount",
        "NumRowsSelected",
        "NumRowsFiltered",
        "NumRowsFilteredBy",
        "RemoveFilter",
        "NumRowsLoaded",
        "ReloadData",
        "Reload",
        "showEveryDate",
        "groupedByWeekday",
        "groupedByMonth",
        "groupedByYear",
        "Count",
        "ConnectionInterrupted",
        "ConnectionReestablished",
        "Reconnecting_",
        "SelectAll",
        "SelectNone",
        "ServerError",
        "SessionTimeout",
        "SessionExpiredMsg",
        "Move",
        "toBegin",
        "forward",
        "backward",
        "toEnd",
        "ascending",
        "descending",
        "ascendingAdditionally",
        "descendingAdditionally",
        "Sum",
        "overEverything",
        "overSelection",
        "grouped",
        "ColorCells",
        "fromRedToGreen",
        "fromGreenToRed",
        "withBarGraph",
        "remove",
        "add",
        "FilterBy",
        "Reconnecting",
        "Show",
        "Up",
        "Back",
        "Continue",
        "Ignore",
        "UiProcessingErrorTitle",
        "UiProcessingErrorText",
        "UiProcessingErrorAction",
        "PleaseWait_"
        ));
  }
}
