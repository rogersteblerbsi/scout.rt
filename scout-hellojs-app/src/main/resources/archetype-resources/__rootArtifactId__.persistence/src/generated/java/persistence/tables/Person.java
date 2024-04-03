#set( $symbol_pound = '#' )
#set( $symbol_dollar = '$' )
#set( $symbol_escape = '\' )
/*
 * This file is generated by jOOQ.
 */
  package ${package}.persistence.tables;

import ${package}.persistence.Keys;
import ${package}.persistence.Schema;
import ${package}.persistence.tables.records.PersonRecord;

import java.util.Collection;

import org.jooq.Condition;
import org.jooq.Field;
import org.jooq.Name;
import org.jooq.PlainSQL;
import org.jooq.QueryPart;
import org.jooq.SQL;
import org.jooq.Select;
import org.jooq.Stringly;
import org.jooq.Table;
import org.jooq.TableField;
import org.jooq.TableOptions;
import org.jooq.UniqueKey;
import org.jooq.impl.DSL;
import org.jooq.impl.SQLDataType;
import org.jooq.impl.TableImpl;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class Person extends TableImpl<PersonRecord> {

  private static final long serialVersionUID = 1L;

  /**
   * The reference instance of <code>Schema.person</code>
   */
  public static final Person PERSON = new Person();

  /**
   * The class holding records for this type
   */
  @Override
  public Class<PersonRecord> getRecordType() {
    return PersonRecord.class;
  }

  /**
   * The column <code>Schema.person.person_id</code>.
   */
  public final TableField<PersonRecord, String> PERSON_ID = createField(DSL.name("person_id"), SQLDataType.VARCHAR(36).nullable(false), this, "");

  /**
   * The column <code>Schema.person.first_name</code>.
   */
  public final TableField<PersonRecord, String> FIRST_NAME = createField(DSL.name("first_name"), SQLDataType.VARCHAR(200), this, "");

  /**
   * The column <code>Schema.person.last_name</code>.
   */
  public final TableField<PersonRecord, String> LAST_NAME = createField(DSL.name("last_name"), SQLDataType.VARCHAR(200).nullable(false), this, "");

  /**
   * The column <code>Schema.person.salary</code>.
   */
  public final TableField<PersonRecord, Integer> SALARY = createField(DSL.name("salary"), SQLDataType.INTEGER, this, "");

  /**
   * The column <code>Schema.person.external</code>.
   */
  public final TableField<PersonRecord, Boolean> EXTERNAL = createField(DSL.name("external"), SQLDataType.BOOLEAN, this, "");

  private Person(Name alias, Table<PersonRecord> aliased) {
    this(alias, aliased, (Field<?>[]) null, null);
  }

  private Person(Name alias, Table<PersonRecord> aliased, Field<?>[] parameters, Condition where) {
    super(alias, null, aliased, parameters, DSL.comment(""), TableOptions.table(), where);
  }

  /**
   * Create an aliased <code>Schema.person</code> table reference
   */
  public Person(String alias) {
    this(DSL.name(alias), PERSON);
  }

  /**
   * Create an aliased <code>Schema.person</code> table reference
   */
  public Person(Name alias) {
    this(alias, PERSON);
  }

  /**
   * Create a <code>Schema.person</code> table reference
   */
  public Person() {
    this(DSL.name("person"), null);
  }

  @Override
  public org.jooq.Schema getSchema() {
    return aliased() ? null : Schema.SCHEMA;
  }

  @Override
  public UniqueKey<PersonRecord> getPrimaryKey() {
    return Keys.PERSON_PK;
  }

  @Override
  public Person as(String alias) {
    return new Person(DSL.name(alias), this);
  }

  @Override
  public Person as(Name alias) {
    return new Person(alias, this);
  }

  @Override
  public Person as(Table<?> alias) {
    return new Person(alias.getQualifiedName(), this);
  }

  /**
   * Rename this table
   */
  @Override
  public Person rename(String name) {
    return new Person(DSL.name(name), null);
  }

  /**
   * Rename this table
   */
  @Override
  public Person rename(Name name) {
    return new Person(name, null);
  }

  /**
   * Rename this table
   */
  @Override
  public Person rename(Table<?> name) {
    return new Person(name.getQualifiedName(), null);
  }

  /**
   * Create an inline derived table from this table
   */
  @Override
  public Person where(Condition condition) {
    return new Person(getQualifiedName(), aliased() ? this : null, null, condition);
  }

  /**
   * Create an inline derived table from this table
   */
  @Override
  public Person where(Collection<? extends Condition> conditions) {
    return where(DSL.and(conditions));
  }

  /**
   * Create an inline derived table from this table
   */
  @Override
  public Person where(Condition... conditions) {
    return where(DSL.and(conditions));
  }

  /**
   * Create an inline derived table from this table
   */
  @Override
  public Person where(Field<Boolean> condition) {
    return where(DSL.condition(condition));
  }

  /**
   * Create an inline derived table from this table
   */
  @Override
  @PlainSQL
  public Person where(SQL condition) {
    return where(DSL.condition(condition));
  }

  /**
   * Create an inline derived table from this table
   */
  @Override
  @PlainSQL
  public Person where(@Stringly.SQL String condition) {
    return where(DSL.condition(condition));
  }

  /**
   * Create an inline derived table from this table
   */
  @Override
  @PlainSQL
  public Person where(@Stringly.SQL String condition, Object... binds) {
    return where(DSL.condition(condition, binds));
  }

  /**
   * Create an inline derived table from this table
   */
  @Override
  @PlainSQL
  public Person where(@Stringly.SQL String condition, QueryPart... parts) {
    return where(DSL.condition(condition, parts));
  }

  /**
   * Create an inline derived table from this table
   */
  @Override
  public Person whereExists(Select<?> select) {
    return where(DSL.exists(select));
  }

  /**
   * Create an inline derived table from this table
   */
  @Override
  public Person whereNotExists(Select<?> select) {
    return where(DSL.notExists(select));
  }
}
